import { type EmailOtpType } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/verify/success'

    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = next
    redirectTo.searchParams.delete('token_hash')
    redirectTo.searchParams.delete('type')
    redirectTo.searchParams.delete('next')

    if (token_hash && type) {
        // Collect the session cookies that verifyOtp will produce so we can
        // attach them directly to the redirect response.  Using createClient()
        // (which relies on cookies() from next/headers) does NOT work here
        // because those writes are not forwarded to a manually-created
        // NextResponse — the browser never receives the new session tokens.
        const pendingCookies: Array<{ name: string; value: string; options: Parameters<typeof NextResponse.prototype.cookies.set>[2] }> = []

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        pendingCookies.splice(0, pendingCookies.length)
                        pendingCookies.push(...cookiesToSet)
                    },
                },
            }
        )

        const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

        if (!error) {
            // Mark profile as verified now that the @uwaterloo.ca email is confirmed.
            if (data.user) {
                const verifiedEmail = data.user.email
                await supabase
                    .from('profiles')
                    .update({
                        is_verified: true,
                        email: verifiedEmail,
                    })
                    .eq('id', data.user.id)
            }

            // Attach the new session tokens to the redirect so the browser is
            // immediately authenticated when it lands on /verify/success.
            const response = NextResponse.redirect(redirectTo)
            pendingCookies.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
            )
            return response
        } else {
            console.error('Verification error:', error)
            const errorUrl = new URL('/', request.url)
            errorUrl.searchParams.set('error', 'verification_failed')
            errorUrl.searchParams.set('error_description', error.message)
            return NextResponse.redirect(errorUrl)
        }
    }

    return NextResponse.redirect(new URL('/?error=Invalid verification link', request.url))
}
