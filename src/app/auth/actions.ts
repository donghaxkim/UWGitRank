'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { syncSingleUser } from '@/lib/sync-user'

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

    console.log('[verifyStudentEmail] updateUser success, user email:', data.user?.email)
    return { success: true, email, message: 'A 6-digit verification code has been sent to your email.' }
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

    // Upsert profile with is_verified = true and github_username
    const githubUsername = (user.user_metadata?.user_name || user.user_metadata?.preferred_username) as string | undefined

    try {
        await prisma.profile.upsert({
            where: { id: user.id },
            create: {
                id: user.id,
                username: githubUsername || verifiedEmail.split('@')[0],
                githubUsername: githubUsername,
                fullName: user.user_metadata?.full_name as string | undefined,
                avatarUrl: user.user_metadata?.avatar_url as string | undefined,
                email: verifiedEmail,
                isVerified: true,
            },
            update: {
                isVerified: true,
                email: verifiedEmail,
                githubUsername: githubUsername,
            },
        })

        console.log('[verifyOtpCode] Profile verified for user:', user.id, 'email:', verifiedEmail)

        // Immediately sync GitHub data so the user appears on the leaderboard
        if (githubUsername) {
            try {
                await syncSingleUser(user.id, githubUsername)
                console.log('[verifyOtpCode] GitHub data synced for:', githubUsername)
            } catch (err) {
                console.error('[verifyOtpCode] Sync failed (user will appear after next cron):', err)
            }
        }
    } catch (err) {
        console.error('[verifyOtpCode] Profile upsert failed:', err)
        return { error: 'Verification succeeded but we could not save your profile. Please try again.' }
    }

    return { success: true }
}
