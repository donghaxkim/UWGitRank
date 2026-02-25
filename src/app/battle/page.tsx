import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { getRandomMatchup, signInToView } from "@/app/auth/actions";
import { fetchTopRepos, type TopRepo } from "@/lib/github-repos";
import { BattleArena } from "./battle-arena";
import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Github, Swords, Trophy } from "lucide-react";

export const metadata: Metadata = {
  title: "Battle | UW GitRank",
  description:
    "Vote on head-to-head matchups between Waterloo developers and influence their ELO rankings.",
  alternates: { canonical: "/battle" },
};

export default async function BattlePage() {
  const supabase = await createClient();

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Auth check failed
  }

  if (!user) {
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
            <div className="flex items-center gap-3">
              <Link href="/leaderboard">
                <Button size="sm" variant="ghost" className="cursor-pointer text-zinc-600">
                  <Trophy className="w-4 h-4 mr-1" />
                  Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center gap-6 text-center">
          <FadeIn>
            <Swords className="w-16 h-16 text-[#EAB308] mx-auto" />
            <h1 className="text-3xl font-bold tracking-tight mt-4">Sign in to Battle</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-md">
              Sign in with GitHub to vote on head-to-head matchups and influence ELO rankings.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <form action={signInToView}>
              <Button
                size="lg"
                className="cursor-pointer bg-[#EAB308] text-black hover:bg-[#D9A307] flex items-center gap-2"
              >
                <Github className="w-5 h-5" />
                Sign in with GitHub
              </Button>
            </form>
          </FadeIn>
        </main>
      </div>
    );
  }

  const matchup = await getRandomMatchup();
  if ("error" in matchup) {
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
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-20 text-center">
          <FadeIn>
            <p className="text-muted-foreground">{matchup.error}</p>
          </FadeIn>
        </main>
      </div>
    );
  }

  const [userA, userB] = matchup.users;
  const battleToken = matchup.battleToken;

  let reposA: TopRepo[] = [];
  let reposB: TopRepo[] = [];
  try {
    [reposA, reposB] = await Promise.all([
      userA.githubUsername ? fetchTopRepos(userA.githubUsername) : Promise.resolve([]),
      userB.githubUsername ? fetchTopRepos(userB.githubUsername) : Promise.resolve([]),
    ]);
  } catch (err) {
    console.error("[battle] Failed to fetch repos:", err);
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
          <div className="flex items-center gap-3">
            <Link href="/leaderboard">
              <Button size="sm" variant="ghost" className="cursor-pointer text-zinc-600">
                <Trophy className="w-4 h-4 mr-1" />
                Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <FadeIn>
          <div className="text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
              <Swords className="w-6 h-6 sm:w-7 sm:h-7 text-[#EAB308]" />
              Battle
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Who has the better repos? Pick a winner to update their ELO rating.
            </p>
          </div>
        </FadeIn>

        <BattleArena
          userA={{ ...userA, repos: reposA }}
          userB={{ ...userB, repos: reposB }}
          battleToken={battleToken}
        />
      </main>
    </div>
  );
}
