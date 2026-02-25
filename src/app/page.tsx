import { signOut, signInToView } from "./auth/actions";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { ArrowRight, Github, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AboutModal } from "@/components/AboutModal";
import { FadeIn } from "@/components/motion";
import Link from "next/link";
import { JoinLeaderboardDialog } from "@/components/JoinLeaderboardDialog";

type PageProps = { searchParams: Promise<{ auth_error?: string }> };

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const AUTH_ERROR_MESSAGES: Record<string, string> = {
    signup_required: "No account found. Please sign up first.",
    already_verified: "This account already exists. Logged in instead.",
  };
  const authErrorMessage = params.auth_error
    ? AUTH_ERROR_MESSAGES[params.auth_error] ?? null
    : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isRegistered = false;

  if (user) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { isVerified: true, firstName: true, lastName: true, program: true },
      });
      const hasSignupFields = Boolean(
        profile?.firstName?.trim() &&
        profile?.lastName?.trim() &&
        profile?.program?.trim(),
      );
      isRegistered = hasSignupFields && Boolean(profile?.isVerified);
    } catch (err) {
      console.error("[home] Failed to check registration status:", err);
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-zinc-900 selection:bg-yellow-100 flex flex-col items-center px-4 py-12 sm:p-6">
      <main className="w-full max-w-2xl flex flex-col items-center space-y-8 sm:space-y-10 text-center flex-1 justify-center">
        {/* Hero */}
        <FadeIn>
          <div className="space-y-5">
            <span className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none text-[#EAB308]">
              UW
            </span>
            <span className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none text-zinc-900 inline-flex items-center">
              <img
                src="/GitHub_Invertocat_Black.svg"
                alt=""
                className="h-[0.85em] w-auto shrink-0"
              />
              itRank
            </span>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <p className="text-zinc-500 text-lg">Check your Open-Source Aura.</p>
        </FadeIn>

        {authErrorMessage && (
          <FadeIn delay={0.15}>
            <div className="w-full max-w-md rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {authErrorMessage}
            </div>
          </FadeIn>
        )}

        {/* Actions */}
        <FadeIn delay={0.2}>
          {user && isRegistered ? (
            <div className="flex flex-col items-center gap-5 w-full">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  asChild
                  size="lg"
                  className="cursor-pointer h-14 px-10 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 shadow-[0_0_0_3px_#EAB308] transition-all active:scale-95 text-base font-semibold"
                >
                  <Link href="/leaderboard">
                    <Trophy className="mr-2 w-5 h-5 text-[#EAB308]" />
                    View Leaderboard
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>
              <form action={signOut}>
                <button className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-900 underline underline-offset-4 transition-colors">
                  Sign out of {user.user_metadata.user_name}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 w-full">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <JoinLeaderboardDialog
                  signInToView={signInToView}
                  authErrorMessage={authErrorMessage}
                >
                  <Button
                    type="button"
                    size="lg"
                    className="cursor-pointer h-14 px-8 rounded-lg bg-[#EAB308] text-black hover:bg-[#D9A307] transition-all active:scale-95 text-base font-semibold flex items-center gap-2"
                  >
                    <Github className="w-5 h-5" />
                    Join the Leaderboard
                  </Button>
                </JoinLeaderboardDialog>

                <Button
                  asChild
                  size="lg"
                  className="cursor-pointer h-14 px-8 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 shadow-[0_0_0_3px_#EAB308] transition-all active:scale-95 text-base font-semibold flex items-center gap-2"
                >
                  <Link href="/leaderboard">
                    <Trophy className="w-5 h-5 text-[#EAB308]" />
                    View Leaderboard
                    <ArrowRight className="w-5 h-5 opacity-70" />
                  </Link>
                </Button>
              </div>
              {user && (
                <form action={signOut}>
                  <button className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-900 underline underline-offset-4 transition-colors">
                    Sign out of {user.user_metadata.user_name}
                  </button>
                </form>
              )}
            </div>
          )}
        </FadeIn>
      </main>

      {/* Footer */}
      <FadeIn delay={0.35} y={0} className="pt-10 sm:pt-16">
        <footer className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-4">
            <AboutModal />
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest font-medium">
              © UWGitRank 2026
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest font-medium">
            Not affiliated with the University of Waterloo.
          </span>
        </footer>
      </FadeIn>
    </div>
  );
}
