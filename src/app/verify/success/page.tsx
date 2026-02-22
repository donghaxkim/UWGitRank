import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle2, Trophy, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'

export default async function VerificationSuccessPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/')
    }

    const email = user.email
    const isWaterlooEmail = email?.endsWith('@uwaterloo.ca')

    if (isWaterlooEmail) {
        // 1. Check if profile exists
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single()

        if (profile) {
            // 2. Update existing profile
            await supabase
                .from('profiles')
                .update({
                    is_verified: true,
                    email: email // Sync email to profile in case trigger is missing
                })
                .eq('id', user.id)
        } else {
            // 3. Create missing profile
            await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    username: user.user_metadata?.user_name || user.user_metadata?.preferred_username || (email || '').split('@')[0],
                    full_name: user.user_metadata?.full_name,
                    avatar_url: user.user_metadata?.avatar_url,
                    email: email,
                    is_verified: true
                })
        }
    } else {
        // If they somehow got here without a Waterloo email, send them back to verify
        return redirect('/verify')
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
            <main className="max-w-md w-full animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8 space-y-2">
                    <div className="flex justify-center mb-4 text-green-500">
                        <CheckCircle2 className="w-16 h-16" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Verification Successful
                    </h1>
                    <p className="text-muted-foreground">
                        You're now a verified member of the Waterloo GitRank community.
                    </p>
                </div>

                <Card className="border-border shadow-xl overflow-hidden">
                    <div className="h-2 bg-green-500" />
                    <CardHeader>
                        <CardTitle className="text-xl">Welcome!</CardTitle>
                        <CardDescription>
                            Your stats will now be actively synced and displayed on the leaderboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-muted/50 border border-border rounded-lg flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Rankings are live</p>
                                <p className="text-xs text-muted-foreground">See where you stand on the leaderboard.</p>
                            </div>
                        </div>

                        <Button asChild className="w-full gap-2 py-6 text-lg">
                            <Link href="/leaderboard">
                                Go to Leaderboard
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <p className="text-center mt-8 text-xs text-muted-foreground px-4">
                    Logged in as <span className="font-medium text-foreground">{email}</span>
                </p>
            </main>
        </div>
    )
}
