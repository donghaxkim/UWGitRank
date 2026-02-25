import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { fetchLeaderboard } from "@/lib/leaderboard";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Live rankings of University of Waterloo students by GitHub open-source contributions — stars, merged PRs, commits, endorsements & ELO.",
  alternates: { canonical: "/leaderboard" },
};
import { FadeIn } from "@/components/motion";
import Link from "next/link";
import { signOut, signInToView, fetchUserEndorsements } from "@/app/auth/actions";
import { LeaderboardTable } from "./leaderboard-table";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { Github, Swords } from "lucide-react";
import { VerificationSuccessBanner } from "./verification-success-banner";
import { JoinLeaderboardDialog } from "@/components/JoinLeaderboardDialog";

type PageProps = { searchParams: Promise<{ verified?: string; auth_error?: string; profile?: string }> };

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const showVerifiedSuccess = params.verified === "1";
  const profileUsername = params.profile;
  const authErrorMessage =
    params.auth_error === "signup_required"
      ? "No account found. Please sign up first."
      : null;
  const supabase = await createClient();

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Auth check failed — continue as unauthenticated
  }

  let entries: LeaderboardEntry[] = [];
  try {
    entries = await fetchLeaderboard();
  } catch {
    // Query failed — show empty leaderboard rather than crashing
  }

  // Track this user as a viewer if they're authenticated but not on the leaderboard
  if (user) {
    try {
      const githubUsername = user.user_metadata?.user_name as string | undefined;
      const isOnLeaderboard = githubUsername
        ? entries.some((e) => e.username === githubUsername)
        : false;

      if (githubUsername && !isOnLeaderboard) {
        await prisma.leaderboardViewer.upsert({
          where: { githubUsername },
          create: {
            githubUsername,
            avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
          },
          update: {
            lastSeenAt: new Date(),
            avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
          },
        });
      }
    } catch {
      // Viewer tracking failed — non-critical, continue rendering
    }
  }

  let isRegistered = false;
  let isVerified = false;
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
      isVerified = Boolean(profile?.isVerified);
    } catch {
      // Profile check failed — default to unregistered
    }
  }

  let endorsedUsernames: string[] = [];
  if (user && isVerified) {
    try {
      endorsedUsernames = await fetchUserEndorsements();
    } catch {
      // Non-critical — endorsement buttons will show as un-endorsed
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-zinc-800 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="cursor-pointer font-bold text-xl tracking-tight flex items-center gap-2.5"
          >
            <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center">
              <Github className="w-5 h-5 text-[#EAB308]" />
            </div>
            <span>GitRank</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/battle">
              <Button size="sm" className="cursor-pointer bg-zinc-900 text-[#EAB308] hover:bg-zinc-800 border border-zinc-700 font-semibold">
                <Swords className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Battle</span>
              </Button>
            </Link>
            <Link href="/about" className="hidden sm:block">
              <Button size="sm" variant="ghost" className="cursor-pointer text-zinc-600">
                How Rankings Work
              </Button>
            </Link>
            {(!user || !isRegistered) ? (
              <JoinLeaderboardDialog
                signInToView={signInToView}
                authErrorMessage={authErrorMessage}
              >
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer bg-[#EAB308] text-black hover:bg-[#D9A307] flex items-center gap-1 sm:gap-2"
                >
                  <Github className="w-4 h-4" />
                  <span className="hidden sm:inline">Join Leaderboard</span>
                  <span className="sm:hidden">Join</span>
                </Button>
              </JoinLeaderboardDialog>
            ) : null}
            {user && (
              <form action={signOut}>
                <button className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-900 underline underline-offset-4 transition-colors">
                  <span className="hidden sm:inline">Sign out</span>
                  <span className="sm:hidden">Out</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <FadeIn>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Leaderboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Waterloo student GitHub rankings · scored by stars, PRs,
              commits, endorsements &amp; ELO
            </p>
          </div>
        </FadeIn>

        {showVerifiedSuccess && user && (
          <VerificationSuccessBanner
            githubUsername={user.user_metadata?.user_name as string | undefined}
          />
        )}

        <FadeIn delay={0.15}>
          <LeaderboardTable
            data={entries}
            currentUserUsername={
              user?.user_metadata?.user_name as string | undefined
            }
            isVerified={isVerified}
            endorsedUsernames={endorsedUsernames}
            highlightUsername={profileUsername}
          />
        </FadeIn>
      </main>
    </div>
  );
}
