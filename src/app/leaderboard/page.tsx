import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { fetchLeaderboard } from "@/lib/leaderboard";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { LeaderboardTable } from "./leaderboard-table";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { Github } from "lucide-react";

export default async function LeaderboardPage() {
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

  let isVerified = false;
  if (user) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { isVerified: true },
      });
      isVerified = profile?.isVerified ?? false;
    } catch {
      // Profile check failed — default to unverified
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-zinc-800 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-bold text-xl tracking-tight flex items-center gap-2.5"
          >
            <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center">
              <Github className="w-5 h-5 text-[#EAB308]" />
            </div>
            <span>GitRank</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/about">
              <Button size="sm" variant="ghost" className="text-zinc-600">
                How Rankings Work
              </Button>
            </Link>
            {user && !isVerified && (
              <Link href="/verify">
                <Button
                  size="sm"
                  className="bg-[#EAB308] text-black hover:bg-[#D9A307] flex items-center gap-2"
                >
                  Join Rankings
                </Button>
              </Link>
            )}
            {user && (
              <form action={signOut}>
                <button className="text-xs text-zinc-400 hover:text-zinc-900 underline underline-offset-4 transition-colors">
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <FadeIn>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="w-7 h-7 text-[#EAB308]" />
              Rankings
            </h1>
            <p className="text-muted-foreground text-sm">
              Waterloo student GitHub rankings · scored by stars, PRs &amp;
              commits
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <LeaderboardTable data={entries} />
        </FadeIn>
      </main>
    </div>
  );
}
