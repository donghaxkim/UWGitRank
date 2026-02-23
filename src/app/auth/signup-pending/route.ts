import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies, headers } from 'next/headers'

const SIGNUP_PENDING_COOKIE = 'signup_pending'
const COOKIE_MAX_AGE = 60 * 15 // 15 minutes

async function getOrigin() {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    }
    const headerList = await headers()
    const origin = headerList.get('origin')
    if (origin) return origin
    const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
    const proto = headerList.get('x-forwarded-proto') ?? 'http'
    return `${proto}://${host}`
}

function isValidLinkedInUrl(url: string): boolean {
    if (!url || url.trim() === '') return true
    try {
        const u = new URL(url)
        return u.hostname === 'www.linkedin.com' || u.hostname === 'linkedin.com'
    } catch {
        return false
    }
}

export async function POST(request: NextRequest) {
    try {
        let body: { firstName?: string; lastName?: string; program?: string; linkedinUrl?: string }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
        const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
        const program = typeof body.program === 'string' ? body.program.trim() : ''
        const linkedinUrl = typeof body.linkedinUrl === 'string' ? body.linkedinUrl.trim() : ''

        if (!firstName || !lastName) {
            return NextResponse.json(
                { error: 'First name and last name are required' },
                { status: 400 }
            )
        }
        if (!program) {
            return NextResponse.json(
                { error: 'Please select a program' },
                { status: 400 }
            )
        }
        if (!isValidLinkedInUrl(linkedinUrl)) {
            return NextResponse.json(
                { error: 'Please enter a valid LinkedIn profile URL' },
                { status: 400 }
            )
        }

        const payload = JSON.stringify({
            firstName,
            lastName,
            program,
            linkedinUrl: linkedinUrl || null,
        })

        const origin = await getOrigin()
        const supabase = await createClient()
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${origin}/auth/callback?next=/verify`,
                queryParams: { prompt: 'select_account' },
            },
        })

        if (error) {
            console.error('[signup-pending] OAuth error:', error.message, error)
            return NextResponse.json(
                { error: error.message || 'Could not start sign in. Please try again.' },
                { status: 500 }
            )
        }

        if (!data?.url) {
            console.error('[signup-pending] OAuth returned no URL. Add to Supabase Auth → URL Configuration:', `${origin}/auth/callback`)
            return NextResponse.json(
                {
                    error: 'Sign-in URL could not be generated. In Supabase Dashboard go to Authentication → URL Configuration and add your Site URL and Redirect URL: ' + `${origin}/auth/callback`,
                },
                { status: 500 }
            )
        }

        const response = NextResponse.json({ redirectUrl: data.url })
        response.cookies.set(SIGNUP_PENDING_COOKIE, payload, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: COOKIE_MAX_AGE,
            path: '/',
        })
        return response
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong'
        console.error('[signup-pending] Unexpected error:', err)
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
