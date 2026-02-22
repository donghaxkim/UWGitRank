import { signInWithGithub, signOut } from './auth/actions'
import { createClient } from '@/utils/supabase/server'
import { ArrowRight, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Auto-verification logic remains the same
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('is_verified')
      .eq('id', user.id)
      .single()

    const isWaterlooEmail = user.email?.endsWith('@uwaterloo.ca')
    if (isWaterlooEmail && data && !data.is_verified) {
      await supabase
        .from('profiles')
        .update({ is_verified: true, email: user.email })
        .eq('id', user.id)
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-zinc-900 selection:bg-yellow-100 flex flex-col items-center justify-center p-6">

      {/* Top Left Branding */}
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2.5">
        <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center">
          <Github className="w-5 h-5 text-[#EAB308]" />
        </div>
        <span className="text-base font-semibold tracking-tight">GitRank</span>
      </Link>

      <main className="w-full max-w-2xl flex flex-col items-center space-y-8 text-center">

        {/* Hero */}
        <div className="space-y-5">
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-none text-zinc-900">
            View your Waterloo<br />GitHub rank.
          </h1>
          <p className="text-zinc-500 text-lg">
            Join the Waterloo GitHub leaderboard.
          </p>
        </div>

        {/* Action */}
        {user ? (
          <div className="flex flex-col items-center gap-5">
            <Button asChild size="lg" className="h-14 px-10 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 shadow-[0_0_0_3px_#EAB308] transition-all active:scale-95 text-base font-semibold">
              <Link href="/leaderboard">
                View Leaderboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <form action={signOut}>
              <button className="text-xs text-zinc-400 hover:text-zinc-900 underline underline-offset-4 transition-colors">
                Sign out of {user.user_metadata.user_name}
              </button>
            </form>
          </div>
        ) : (
          <form action={signInWithGithub}>
            <Button
              type="submit"
              size="lg"
              className="h-14 px-10 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 shadow-[0_0_0_3px_#EAB308] transition-all active:scale-95 text-base font-semibold flex items-center gap-3"
            >
              <Github className="w-5 h-5 text-[#EAB308]" />
              Sign in with GitHub to continue
              <ArrowRight className="ml-1 w-5 h-5 opacity-70" />
            </Button>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="absolute bottom-8 text-[11px] font-mono text-zinc-400 uppercase tracking-widest font-medium">
        © UW GitRank 2026
      </footer>
    </div>
  )
}