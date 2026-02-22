import { createClient } from "@/utils/supabase/server";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { signInWithGithub } from "@/app/auth/actions";
import { LeaderboardTable } from "./leaderboard-table";
import type { LeaderboardEntry } from "./leaderboard-table";
import { Github } from "lucide-react";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("leaderboard")
    .select("rank, username, avatar_url, is_verified, program, rank_score")
    .order("rank", { ascending: true });

  const entries: LeaderboardEntry[] = (data ?? []).map((row) => ({
    rank: row.rank as number,
    username: row.username as string,
    avatar_url: row.avatar_url as string | null,
    is_verified: row.is_verified as boolean,
    program: row.program as string | null,
    rank_score: row.rank_score as number,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-zinc-800 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-bold text-xl tracking-tight flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center">
              <Github className="w-5 h-5 text-[#EAB308]" />
            </div>
            <span>GitRank</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/about">
              <Button size="sm" variant="ghost" className="text-zinc-600">
                How it Works
              </Button>
            </Link>
            {!user && (
              <form action={signInWithGithub}>
                <Button size="sm" className="bg-[#EAB308] text-black hover:bg-[#D9A307] flex items-center gap-2">
                  <Github className="w-4 h-4" />
                  Join GitRank
                </Button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" />
            GitHub Rankings
          </p>
        </div>

        <LeaderboardTable data={entries} />
      </main>
    </div>
  );
}
