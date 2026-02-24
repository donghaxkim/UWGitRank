'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { syncSingleUser } from '@/lib/sync-user'

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

// Sign in to join the rankings — redirects to /verify after OAuth
export async function signInToJoin() {
    const supabase = await createClient()
    const origin = await getOrigin()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: `${origin}/auth/callback?next=/verify`,
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

export async function verifyStudentEmail(prevState: any, formData: FormData) {
    const email = formData.get('email') as string

    if (!email || !email.endsWith('@uwaterloo.ca')) {
        return { error: 'Please enter a valid @uwaterloo.ca email address' }
    }

    const supabase = await createClient()

    console.log('[verifyStudentEmail] Sending OTP to:', email)
    const { data, error } = await supabase.auth.updateUser({ email })

    if (error) {
        console.error('[verifyStudentEmail] updateUser error:', error)
        return { error: error.message }
    }

    const currentEmail = data.user?.email ?? null
    // resend() for email_change requires the CURRENT user email (not the new one). OAuth users often have no current email.
    if (currentEmail) {
        const { error: resendError } = await supabase.auth.resend({
            type: 'email_change',
            email: currentEmail,
        })
        if (resendError) {
            console.error('[verifyStudentEmail] resend failed:', resendError)
        }
    } else {
        // OAuth / no current email: trigger send by calling updateUser again (Supabase then sends the OTP to the new email).
        const { error: secondError } = await supabase.auth.updateUser({ email })
        if (secondError) {
            console.error('[verifyStudentEmail] second updateUser failed:', secondError)
        }
    }

    console.log('[verifyStudentEmail] success, new email:', email)
    return { success: true, email, message: 'A 6-digit verification code has been sent to your email.' }
}

/** Resend the 6-digit verification code to the given (new) email. Use after the initial send (respect 60s cooldown on client). */
export async function resendVerificationCode(email: string) {
    if (!email || !email.endsWith('@uwaterloo.ca')) {
        return { error: 'Please enter a valid @uwaterloo.ca email address' }
    }

    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    const currentEmail = userData.user?.email ?? null

    if (currentEmail) {
        const { error } = await supabase.auth.resend({
            type: 'email_change',
            email: currentEmail,
        })
        if (error) {
            console.error('[resendVerificationCode] resend error:', error)
            return { error: error.message }
        }
    } else {
        // OAuth / no current email: resend doesn't work; call updateUser again to trigger sending OTP to the new email.
        const { error } = await supabase.auth.updateUser({ email })
        if (error) {
            console.error('[resendVerificationCode] updateUser error:', error)
            return { error: error.message }
        }
    }

    return { success: true, message: 'A new 6-digit code has been sent to your email.' }
}

export async function verifyOtpCode(email: string, token: string) {
    if (!email || !token || token.length !== 6) {
        return { error: 'Invalid code' }
    }

    const supabase = await createClient()

    // Verify the OTP using the same server-side session that sent it
    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email_change',
    })

    if (error) {
        console.error('[verifyOtpCode] verifyOtp error:', error)
        return { error: error.message }
    }

    // OTP verified — mark profile as verified
    const user = data.user
    if (!user) {
        return { error: 'Verification succeeded but no user returned' }
    }

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
        console.log('[verifyOtpCode] Profile verified for user:', userId, 'email:', verifiedEmail)
    } catch (err: unknown) {
        const prismaErr = err as { code?: string; message?: string; meta?: unknown }
        const code = prismaErr?.code
        const message = prismaErr?.message ?? String(err)
        console.error('[verifyOtpCode] Profile upsert failed:', { code, message, meta: prismaErr?.meta })

        // P2002 = unique constraint violation (e.g. username already taken)
        const isUniqueViolation = code === 'P2002'
        if (isUniqueViolation) {
            const fallbackUsername = `user_${userId.slice(0, 8)}`
            try {
                await doUpsert(userId, fallbackUsername)
                console.log('[verifyOtpCode] Profile verified with fallback username for user:', userId)
            } catch (retryErr: unknown) {
                const retryPrisma = retryErr as { code?: string; message?: string; meta?: unknown }
                console.error('[verifyOtpCode] Profile upsert failed (retry):', {
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

    // Immediately sync GitHub data so the user appears on the leaderboard
    if (githubUsername) {
        try {
            await syncSingleUser(user.id, githubUsername)
            console.log('[verifyOtpCode] GitHub data synced for:', githubUsername)
        } catch (err) {
            console.error('[verifyOtpCode] Sync failed (user will appear after next cron):', err)
        }
    }

    return { success: true }
}
