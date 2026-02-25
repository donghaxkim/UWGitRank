import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Github,
  Trophy,
  Calculator,
  Star,
  GitPullRequest,
  GitCommit,
  Heart,
  Swords,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn how UW GitRank scores Waterloo students — the formula, metric weights, endorsements, data sync, and how to get ranked.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f2f2f2] text-zinc-900 px-4 sm:p-6 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8 sm:space-y-12 py-8 sm:py-12">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rankings
          </Link>
          <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center">
            <Github className="w-5 h-5 text-[#EAB308]" />
          </div>
        </div>

        {/* Hero */}
        <FadeIn>
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-zinc-900 text-[#EAB308] text-xs font-mono font-semibold px-3 py-1.5 rounded-full">
              <Trophy className="w-3.5 h-3.5" />
              Ranking System Docs
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              How the Ranking System Works
            </h1>
            <p className="text-zinc-600 text-base sm:text-lg">
              GitRank scores every verified Waterloo student&apos;s open-source
              impact using a weighted formula pulled directly from the GitHub API.
              Here&apos;s exactly how it works.
            </p>
          </div>
        </FadeIn>

        {/* Score Formula */}
        <FadeIn viewOnce className="bg-zinc-900 text-white rounded-2xl p-5 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 text-[#EAB308]">
            <Calculator className="w-5 h-5" />
            <h2 className="text-xl font-bold">The Formula</h2>
          </div>
          <div className="font-mono text-xs sm:text-sm bg-black/40 rounded-xl p-4 sm:p-5 space-y-2 border border-zinc-700 overflow-x-auto">
            <p className="text-zinc-400">{"// Rank Score calculation"}</p>
            <p>
              <span className="text-[#EAB308]">rankScore</span>
              <span className="text-zinc-300"> = </span>
              <span className="text-yellow-300">stars</span>
              <span className="text-zinc-300"> × 10</span>
            </p>
            <p>
              <span className="text-zinc-300 pl-8 sm:pl-14">+ </span>
              <span className="text-blue-300">mergedPRs</span>
              <span className="text-zinc-300"> × 5</span>
            </p>
            <p>
              <span className="text-zinc-300 pl-8 sm:pl-14">+ </span>
              <span className="text-green-300">commits</span>
              <span className="text-zinc-300"> × 1</span>
            </p>
            <p>
              <span className="text-zinc-300 pl-8 sm:pl-14">+ </span>
              <span className="text-pink-300">endorsements</span>
              <span className="text-zinc-300"> × 3</span>
            </p>
            <p>
              <span className="text-zinc-300 pl-8 sm:pl-14">+ </span>
              <span className="text-zinc-300">(</span>
              <span className="text-orange-300">ELO</span>
              <span className="text-zinc-300"> − 1200) × 0.5</span>
            </p>
          </div>
          <p className="text-zinc-400 text-sm">
            GitHub stats are recalculated nightly. Endorsements update in
            real-time when peers endorse you. ELO rating starts at 1200 and
            shifts based on community votes in Battle mode. Higher weight is
            given to stars and PRs because they reflect external recognition
            and meaningful collaboration.
          </p>
        </FadeIn>

        {/* Metric Breakdown */}
        <FadeIn viewOnce className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Metric Breakdown</h2>

          <StaggerContainer viewOnce stagger={0.12} className="grid gap-4">
            {/* Stars */}
            <StaggerItem className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 text-yellow-600">
                  <Star className="w-5 h-5 shrink-0" />
                  <h3 className="font-bold text-zinc-900 text-sm sm:text-base">Repository Stars</h3>
                </div>
                <span className="font-mono text-xs sm:text-sm font-bold bg-yellow-50 border border-yellow-200 text-yellow-700 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
                  × 10 pts
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                Stars are the strongest signal of community impact. We count
                stars on <strong>non-forked repositories</strong> where you are
                the owner or primary contributor. A repo with 100 stars adds
                1,000 points to your score.
              </p>
              <ul className="text-xs text-zinc-400 space-y-1 pl-4 list-disc">
                <li>Only counts repos you own (not forks)</li>
                <li>Reflects real-world adoption of your work</li>
                <li>Highest weight in the formula (≈ 50% of a typical score)</li>
              </ul>
            </StaggerItem>

            {/* PRs */}
            <StaggerItem className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 text-blue-600">
                  <GitPullRequest className="w-5 h-5 shrink-0" />
                  <h3 className="font-bold text-zinc-900 text-sm sm:text-base">Merged Pull Requests</h3>
                </div>
                <span className="font-mono text-xs sm:text-sm font-bold bg-blue-50 border border-blue-200 text-blue-700 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
                  × 5 pts
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                Merged PRs represent meaningful collaboration — code that was
                reviewed, accepted, and shipped. We count your{" "}
                <strong>total lifetime merged pull requests</strong> across all
                public repositories.
              </p>
              <ul className="text-xs text-zinc-400 space-y-1 pl-4 list-disc">
                <li>Counts PRs merged into any public repo (yours or others)</li>
                <li>Rewards contributions to popular open-source projects</li>
                <li>Only merged PRs count — open or closed ones do not</li>
              </ul>
            </StaggerItem>

            {/* Commits */}
            <StaggerItem className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 text-green-600">
                  <GitCommit className="w-5 h-5 shrink-0" />
                  <h3 className="font-bold text-zinc-900 text-sm sm:text-base">Total Commits</h3>
                </div>
                <span className="font-mono text-xs sm:text-sm font-bold bg-green-50 border border-green-200 text-green-700 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
                  × 1 pt
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                Commits show consistent, ongoing activity. We use GitHub&apos;s
                contribution graph to count{" "}
                <strong>total commit contributions</strong> across all public
                repositories. Steady contributors are rewarded even without big
                star counts.
              </p>
              <ul className="text-xs text-zinc-400 space-y-1 pl-4 list-disc">
                <li>Includes commits to any public repo</li>
                <li>Lowest individual weight but compounds over time</li>
                <li>Private repo commits are not counted</li>
              </ul>
            </StaggerItem>

            {/* Endorsements */}
            <StaggerItem className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 text-pink-600">
                  <Heart className="w-5 h-5 shrink-0" />
                  <h3 className="font-bold text-zinc-900 text-sm sm:text-base">Peer Endorsements</h3>
                </div>
                <span className="font-mono text-xs sm:text-sm font-bold bg-pink-50 border border-pink-200 text-pink-700 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
                  × 3 pts
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                Endorsements let verified UW students recognize each other.
                Click the heart icon on the leaderboard to endorse someone
                whose work you respect. Each endorsement adds{" "}
                <strong>3 points</strong> to their score.
              </p>
              <ul className="text-xs text-zinc-400 space-y-1 pl-4 list-disc">
                <li>One endorsement per person (toggle on/off)</li>
                <li>Only verified UW students can endorse</li>
                <li>You cannot endorse yourself</li>
                <li>Endorsements apply equally across all time windows</li>
              </ul>
            </StaggerItem>

            {/* ELO Rating */}
            <StaggerItem className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 text-orange-600">
                  <Swords className="w-5 h-5 shrink-0" />
                  <h3 className="font-bold text-zinc-900 text-sm sm:text-base">ELO Rating</h3>
                </div>
                <span className="font-mono text-xs sm:text-sm font-bold bg-orange-50 border border-orange-200 text-orange-700 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
                  (ELO − 1200) × 0.5
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                ELO is a peer-voted rating determined in{" "}
                <strong>Battle mode</strong>. Two random profiles are shown
                side-by-side and the community picks who has the better repos.
                Winners gain rating, losers drop — just like chess rankings.
              </p>
              <ul className="text-xs text-zinc-400 space-y-1 pl-4 list-disc">
                <li>Everyone starts at 1200 (baseline — no bonus or penalty)</li>
                <li>Only the difference from 1200 counts toward your score</li>
                <li>Rating above 1200 adds points, below 1200 subtracts</li>
                <li>K-factor of 32 — ratings shift quickly early on</li>
              </ul>
            </StaggerItem>
          </StaggerContainer>
        </FadeIn>

        {/* Score Example */}
        <FadeIn viewOnce className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#EAB308]" />
            <h2 className="font-bold">Example Score Calculation</h2>
          </div>
          <div className="p-4 sm:p-6 space-y-3 font-mono text-xs sm:text-sm">
            <div className="flex justify-between gap-2 text-zinc-500">
              <span className="truncate">Stars on owned repos</span>
              <span className="text-yellow-600 font-semibold shrink-0">842 × 10 = 8,420</span>
            </div>
            <div className="flex justify-between gap-2 text-zinc-500">
              <span className="truncate">Merged pull requests</span>
              <span className="text-blue-600 font-semibold shrink-0">37 × 5 = 185</span>
            </div>
            <div className="flex justify-between gap-2 text-zinc-500">
              <span className="truncate">Total commits</span>
              <span className="text-green-600 font-semibold shrink-0">1,204 × 1 = 1,204</span>
            </div>
            <div className="flex justify-between gap-2 text-zinc-500">
              <span className="truncate">Peer endorsements</span>
              <span className="text-pink-600 font-semibold shrink-0">12 × 3 = 36</span>
            </div>
            <div className="flex justify-between gap-2 text-zinc-500">
              <span className="truncate">ELO bonus (1280 − 1200)</span>
              <span className="text-orange-600 font-semibold shrink-0">80 × 0.5 = 40</span>
            </div>
            <div className="border-t border-zinc-100 pt-3 flex justify-between gap-2 font-bold text-zinc-900 text-sm sm:text-base">
              <span>Rank Score</span>
              <span className="text-[#EAB308]">9,885</span>
            </div>
          </div>
        </FadeIn>

        {/* Data Sync */}
        <FadeIn viewOnce className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
          <div className="flex items-center gap-3 text-zinc-700">
            <RefreshCw className="w-5 h-5" />
            <h2 className="font-bold text-zinc-900">Data Sync &amp; Freshness</h2>
          </div>
          <p className="text-sm text-zinc-500">
            GitHub stats are fetched nightly via the{" "}
            <strong>GitHub GraphQL API</strong>. Rankings update once per day.
            If you just verified or made a big push, your score will reflect it
            on the next sync.
          </p>
        </FadeIn>

        {/* Verification CTA */}
        <FadeIn viewOnce className="bg-zinc-900 text-white p-5 sm:p-8 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center gap-3 text-[#EAB308]">
            <Award className="w-6 h-6" />
            <h3 className="text-xl font-bold">Get on the Board</h3>
          </div>
          <p className="text-zinc-300">
            Already signed in with GitHub? Link your{" "}
            <strong>@uwaterloo.ca</strong> email to join the official rankings.
            Verification takes less than a minute.
          </p>
          <Button
            asChild
            className="bg-[#EAB308] text-black hover:bg-[#D9A307] font-bold"
          >
            <Link href="/verify">Verify &amp; Join Rankings</Link>
          </Button>
        </FadeIn>

        {/* Footer */}
        <footer className="text-center pt-4">
          <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest">
            © UW GitRank 2026
          </p>
        </footer>
      </div>
    </div>
  );
}
