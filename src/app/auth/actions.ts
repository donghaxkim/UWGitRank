'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers, cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { syncSingleUser } from '@/lib/sync-user'
import { refreshLeaderboard } from '@/lib/leaderboard'
import { generateOtp, sendOtpEmail } from '@/lib/email'
import { calculateElo } from '@/lib/elo'

const SIGNUP_PENDING_COOKIE = 'signup_pending'

async function getOrigin() {
    // Prefer an explicit env var so the URL is always the canonical domain.
    // On Vercel, x-forwarded-host can return a preview-deployment hostname that
    // isn't in the Supabase redirect-URL allowlist, which silently breaks email sending.
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    }

    const headerList = await headers()
    const origin = headerList.get('origin')
    if (origin) return origin

    // Fallback: build from host header
    const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
    const proto = headerList.get('x-forwarded-proto') ?? 'http'
    return `${proto}://${host}`
}

export async function signInWithGithub() {
    const supabase = await createClient()
    const origin = await getOrigin()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: `${origin}/auth/callback`,
            queryParams: {
                prompt: 'select_account',
            },
        },
    })

    if (error) {
        console.error(error)
        return redirect('/?error=Could not authenticate user')
    }

    return redirect(data.url)
}

// Sign in just to view the rankings — redirects to /leaderboard after OAuth
export async function signInToView() {
    const supabase = await createClient()
    const origin = await getOrigin()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: `${origin}/auth/callback?next=/leaderboard`,
            queryParams: {
                prompt: 'select_account',
            },
        },
    })

    if (error) {
        console.error(error)
        return redirect('/?error=Could not authenticate user')
    }

    return redirect(data.url)
}

// Sign in to join the rankings — redirects to /leaderboard after OAuth
export async function signInToJoin() {
    const supabase = await createClient()
    const origin = await getOrigin()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: `${origin}/auth/callback?next=/leaderboard`,
            queryParams: {
                prompt: 'select_account',
            },
        },
    })

    if (error) {
        console.error(error)
        return redirect('/?error=Could not authenticate user')
    }

    return redirect(data.url)
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    return redirect('/')
}

function normalizeOtpSendError(message: string) {
    if (/sub claim in JWT does not exist/i.test(message) || /user does not exist/i.test(message)) {
        return 'Your session is invalid. Please sign out and log in with GitHub again.'
    }
    if (/only request this after/i.test(message) || /over_email_send_rate_limit/i.test(message)) {
        const waitMatch = message.match(/after\s+(\d+)\s+seconds?/i)
        if (waitMatch?.[1]) {
            return `Please wait ${waitMatch[1]} seconds before requesting another code.`
        }
        return 'Please wait 60 seconds before requesting another code.'
    }
    return message
}

async function finalizeVerifiedUser(user: {
    id: string
    email?: string | null
    user_metadata?: Record<string, unknown> | null
}) {
    const verifiedEmail = user.email
    if (!verifiedEmail?.endsWith('@uwaterloo.ca')) {
        return { error: 'Email is not a verified @uwaterloo.ca address' }
    }

    // Optional signup details from cookie (set when user chose "Sign up" and filled the form)
    let signupDetails: { firstName?: string; lastName?: string; program?: string; linkedinUrl?: string } = {}
    try {
        const cookieStore = await cookies()
        const raw = cookieStore.get(SIGNUP_PENDING_COOKIE)?.value
        if (raw) {
            signupDetails = JSON.parse(raw) as typeof signupDetails
            cookieStore.delete(SIGNUP_PENDING_COOKIE)
        }
    } catch {
        // Ignore cookie parse errors
    }

    const githubUsername = (user.user_metadata?.user_name || user.user_metadata?.preferred_username) as string | undefined
    const fullName = user.user_metadata?.full_name as string | undefined
    const avatarUrl = user.user_metadata?.avatar_url as string | undefined
    const emailLocalPart = verifiedEmail.split('@')[0]
    const preferredUsername = githubUsername || emailLocalPart
    const userId = user.id

    const profileCreate = {
        id: userId,
        username: preferredUsername,
        githubUsername: githubUsername ?? undefined,
        fullName,
        firstName: signupDetails.firstName ?? undefined,
        lastName: signupDetails.lastName ?? undefined,
        avatarUrl,
        email: verifiedEmail,
        isVerified: true,
        program: signupDetails.program ?? undefined,
        linkedinUrl: signupDetails.linkedinUrl ?? undefined,
    }
    const profileUpdate = {
        isVerified: true,
        email: verifiedEmail,
        githubUsername: githubUsername ?? undefined,
        firstName: signupDetails.firstName ?? undefined,
        lastName: signupDetails.lastName ?? undefined,
        program: signupDetails.program ?? undefined,
        linkedinUrl: signupDetails.linkedinUrl ?? undefined,
    }

    async function doUpsert(uid: string, username: string) {
        return prisma.profile.upsert({
            where: { id: uid },
            create: { ...profileCreate, username },
            update: profileUpdate,
        })
    }

    try {
        await doUpsert(userId, preferredUsername)
        console.log('[finalizeVerifiedUser] Profile verified for user:', userId, 'email:', verifiedEmail)
    } catch (err: unknown) {
        const prismaErr = err as { code?: string; message?: string; meta?: unknown }
        const code = prismaErr?.code
        const message = prismaErr?.message ?? String(err)
        console.error('[finalizeVerifiedUser] Profile upsert failed:', { code, message, meta: prismaErr?.meta })

        const isUniqueViolation = code === 'P2002'
        if (isUniqueViolation) {
            const fallbackUsername = `user_${userId.slice(0, 8)}`
            try {
                await doUpsert(userId, fallbackUsername)
                console.log('[finalizeVerifiedUser] Profile verified with fallback username for user:', userId)
            } catch (retryErr: unknown) {
                const retryPrisma = retryErr as { code?: string; message?: string; meta?: unknown }
                console.error('[finalizeVerifiedUser] Profile upsert failed (retry):', {
                    code: retryPrisma?.code,
                    message: retryPrisma?.message ?? String(retryErr),
                    meta: retryPrisma?.meta,
                })
                return { error: 'Verification succeeded but we could not save your profile. Please try again.' }
            }
        } else {
            return { error: 'Verification succeeded but we could not save your profile. Please try again.' }
        }
    }

    if (githubUsername) {
        try {
            await syncSingleUser(user.id, githubUsername)
            console.log('[finalizeVerifiedUser] GitHub data synced for:', githubUsername)
        } catch (err) {
            console.error('[finalizeVerifiedUser] Sync failed (user will appear after next cron):', err)
        }
    }

    return { success: true as const }
}

export async function verifyStudentEmail(_prevState: unknown, formData: FormData) {
    const email = formData.get('email') as string

    if (!email || !email.endsWith('@uwaterloo.ca')) {
        return { error: 'Please enter a valid @uwaterloo.ca email address' }
    }

    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
        return { error: 'Your session is invalid. Please sign out and log in with GitHub again.' }
    }

    const currentEmail = userData.user.email?.toLowerCase()
    const targetEmail = email.toLowerCase()
    const emailAlreadyMatches = currentEmail === targetEmail
    const emailConfirmed = Boolean(userData.user.email_confirmed_at)

    if (emailAlreadyMatches && emailConfirmed) {
        const finalized = await finalizeVerifiedUser(userData.user)
        if (finalized.error) return finalized
        return { success: true, email, autoVerified: true }
    }

    const userId = userData.user.id
    const code = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Remove any existing codes for this user+email, then insert the new one
    await prisma.emailVerification.deleteMany({ where: { userId, email: targetEmail } })
    await prisma.emailVerification.create({ data: { userId, email: targetEmail, code, expiresAt } })

    try {
        console.log('[verifyStudentEmail] Sending OTP to:', targetEmail, 'for user:', userId)
        await sendOtpEmail(targetEmail, code)
        console.log('[verifyStudentEmail] OTP email sent successfully to:', targetEmail)
    } catch (err) {
        console.error('[verifyStudentEmail] Failed to send OTP email:', err)
        return { error: 'Failed to send verification email. Please try again.' }
    }

    return { success: true, email: targetEmail, message: 'A 6-digit verification code has been sent to your email.' }
}

/** Resend the 6-digit verification code using the authenticated user session. */
export async function resendVerificationCode(email: string) {
    if (!email || !email.endsWith('@uwaterloo.ca')) {
        return { error: 'Please enter a valid @uwaterloo.ca email address' }
    }

    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
        return { error: 'Your session is invalid. Please sign out and log in with GitHub again.' }
    }

    const userId = userData.user.id
    const targetEmail = email.toLowerCase()
    const code = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.emailVerification.deleteMany({ where: { userId, email: targetEmail } })
    await prisma.emailVerification.create({ data: { userId, email: targetEmail, code, expiresAt } })

    try {
        console.log('[resendVerificationCode] Sending OTP to:', targetEmail, 'for user:', userId)
        await sendOtpEmail(targetEmail, code)
    } catch (err) {
        console.error('[resendVerificationCode] Failed to send OTP email:', err)
        return { error: 'Failed to send verification email. Please try again.' }
    }

    return { success: true, message: 'A new 6-digit code has been sent to your email.' }
}

export async function verifyOtpCode(email: string, token: string) {
    if (!email || !token || token.length !== 6) {
        return { error: 'Invalid code' }
    }

    const supabase = await createClient()
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !sessionData.user) {
        return { error: 'Your session is invalid. Please sign out and log in with GitHub again.' }
    }

    const userId = sessionData.user.id
    const targetEmail = email.toLowerCase()

    const record = await prisma.emailVerification.findFirst({
        where: { userId, email: targetEmail },
        orderBy: { createdAt: 'desc' },
    })

    if (!record) {
        return { error: 'No verification code found. Please request a new one.' }
    }

    if (new Date() > record.expiresAt) {
        await prisma.emailVerification.delete({ where: { id: record.id } })
        return { error: 'Code has expired. Please request a new one.' }
    }

    if (record.code !== token) {
        return { error: 'Invalid code. Please try again.' }
    }

    // Code is valid — clean up and update the user's email in Supabase auth
    await prisma.emailVerification.deleteMany({ where: { userId, email: targetEmail } })

    const admin = createAdminClient()

    // The old Supabase updateUser flow may have created orphan auth entries for this
    // email. Remove any existing user that holds the target email (but isn't us)
    // so the update can proceed.
    const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const orphan = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === targetEmail && u.id !== userId
    )
    if (orphan) {
        console.log('[verifyOtpCode] Removing orphan auth user holding target email:', orphan.id)
        await admin.auth.admin.deleteUser(orphan.id)
    }

    const { error: adminError } = await admin.auth.admin.updateUserById(userId, {
        email: targetEmail,
        email_confirm: true,
    })
    if (adminError) {
        console.error('[verifyOtpCode] admin updateUser error:', adminError.message, adminError.status)
        return { error: 'Verification succeeded but failed to update your account. Please try again.' }
    }

    // Re-fetch the user to get updated metadata
    const { data: updatedUser, error: fetchError } = await admin.auth.admin.getUserById(userId)
    if (fetchError || !updatedUser.user) {
        console.error('[verifyOtpCode] Failed to fetch updated user:', fetchError)
        return { error: 'Verification succeeded but failed to load your profile. Please try again.' }
    }

    return finalizeVerifiedUser(updatedUser.user)
}

/**
 * Toggle an endorsement from the current user to the target user.
 * Returns the new endorsed state and the target's updated endorsement count.
 */
export async function toggleEndorsement(targetUsername: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
        return { error: 'You must be logged in to endorse.' }
    }

    const voter = await prisma.profile.findUnique({
        where: { id: data.user.id },
        select: { id: true, isVerified: true, username: true },
    })
    if (!voter?.isVerified) {
        return { error: 'Only verified UW students can endorse.' }
    }

    if (voter.username === targetUsername) {
        return { error: 'You cannot endorse yourself.' }
    }

    const targetProfile = await prisma.profile.findUnique({
        where: { username: targetUsername },
        select: { id: true },
    })
    if (!targetProfile) {
        return { error: 'Target user not found.' }
    }

    const existing = await prisma.endorsement.findUnique({
        where: { voterId_targetUserId: { voterId: voter.id, targetUserId: targetProfile.id } },
    })

    if (existing) {
        await prisma.endorsement.delete({ where: { id: existing.id } })
    } else {
        await prisma.endorsement.create({
            data: { voterId: voter.id, targetUserId: targetProfile.id },
        })
    }

    const count = await prisma.endorsement.count({
        where: { targetUserId: targetProfile.id },
    })

    await prisma.githubMetrics.updateMany({
        where: { userId: targetProfile.id },
        data: { endorsementCount: count },
    })

    try {
        await refreshLeaderboard()
    } catch {
        // Non-critical: the materialized view will catch up on next cron sync
    }

    revalidatePath('/leaderboard')
    return { endorsed: !existing, count }
}

/**
 * Fetch the list of usernames the current user has endorsed.
 */
export async function fetchUserEndorsements(): Promise<string[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return []

    const endorsements = await prisma.endorsement.findMany({
        where: { voterId: data.user.id },
        select: { target: { select: { username: true } } },
    })

    return endorsements
        .map((e) => e.target.username)
        .filter((u): u is string => u != null)
}

export interface MatchupUser {
    id: string
    username: string
    githubUsername: string
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
    program: string | null
    eloRating: number
}

/**
 * Get two random verified users for an ELO battle.
 * Excludes the current user from the matchup.
 */
export async function getRandomMatchup(): Promise<{ users: [MatchupUser, MatchupUser] } | { error: string }> {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
        return { error: 'You must be logged in to battle.' }
    }

    const currentUserId = data.user.id

    const rows = await prisma.$queryRaw<MatchupUser[]>`
        SELECT
            p.id,
            p.username,
            p.github_username AS "githubUsername",
            p.first_name AS "firstName",
            p.last_name AS "lastName",
            p.avatar_url AS "avatarUrl",
            p.program,
            gm.elo_rating AS "eloRating"
        FROM public.profiles p
        INNER JOIN public.github_metrics gm ON gm.user_id = p.id
        WHERE p.is_verified = true
          AND p.id != ${currentUserId}::uuid
        ORDER BY RANDOM()
        LIMIT 2
    `

    if (rows.length < 2) {
        return { error: 'Not enough users to create a matchup.' }
    }

    return { users: [rows[0], rows[1]] }
}

/**
 * Submit an ELO vote: the voter picks a winner from a matchup.
 * Updates both users' ELO ratings and records the match.
 */
export async function submitEloVote(winnerId: string, loserId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
        return { error: 'You must be logged in to vote.' }
    }

    const voterId = data.user.id

    if (voterId === winnerId || voterId === loserId) {
        return { error: 'You cannot vote in a matchup that includes yourself.' }
    }

    if (winnerId === loserId) {
        return { error: 'Invalid matchup.' }
    }

    const [winnerMetrics, loserMetrics] = await Promise.all([
        prisma.githubMetrics.findUnique({ where: { userId: winnerId }, select: { eloRating: true } }),
        prisma.githubMetrics.findUnique({ where: { userId: loserId }, select: { eloRating: true } }),
    ])

    if (!winnerMetrics || !loserMetrics) {
        return { error: 'One or both users not found.' }
    }

    const winnerEloBefore = winnerMetrics.eloRating
    const loserEloBefore = loserMetrics.eloRating
    const { newWinnerRating, newLoserRating } = calculateElo(winnerEloBefore, loserEloBefore)

    await Promise.all([
        prisma.githubMetrics.update({
            where: { userId: winnerId },
            data: { eloRating: newWinnerRating },
        }),
        prisma.githubMetrics.update({
            where: { userId: loserId },
            data: { eloRating: newLoserRating },
        }),
        prisma.eloMatch.create({
            data: {
                winnerId,
                loserId,
                voterId,
                winnerEloBefore,
                loserEloBefore,
                winnerEloAfter: newWinnerRating,
                loserEloAfter: newLoserRating,
            },
        }),
    ])

    return {
        winnerId,
        loserId,
        winnerEloBefore,
        loserEloBefore,
        winnerEloAfter: newWinnerRating,
        loserEloAfter: newLoserRating,
    }
}
