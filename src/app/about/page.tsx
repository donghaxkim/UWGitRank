import Link from "next/link";
import { ArrowLeft, Star, GitCommit, GitPullRequest, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import GooseLogo from "@/components/GooseLogo";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#f2f2f2] text-zinc-900 p-6 flex flex-col items-center">
            <div className="max-w-2xl w-full space-y-12 py-12">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link href="/leaderboard" className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-black transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Leaderboard
                    </Link>
                    <GooseLogo className="w-8 h-8 text-black" />
                </div>

                {/* Hero */}
                <div className="space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight">How the Ranking Works</h1>
                    <p className="text-zinc-600 text-lg">
                        Waterloo GitRank uses a weighted impact algorithm to measure open-source contributions.
                        We calculate a <b>GitRank Score</b> based on several GitHub metrics.
                    </p>
                </div>

                {/* Metrics Grid */}
                <div className="grid gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
                        <div className="flex items-center gap-3 text-yellow-600">
                            <Star className="w-5 h-5" />
                            <h3 className="font-bold">Stars (50%)</h3>
                        </div>
                        <p className="text-sm text-zinc-500">
                            Stars represent the community value of your work. We look at stars earned on repositories where you are a primary contributor.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
                        <div className="flex items-center gap-3 text-blue-600">
                            <GitPullRequest className="w-5 h-5" />
                            <h3 className="font-bold">Pull Requests (30%)</h3>
                        </div>
                        <p className="text-sm text-zinc-500">
                            PRs represent active collaboration. We count merged pull requests to public repositories, with extra weight for high-traffic projects.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
                        <div className="flex items-center gap-3 text-green-600">
                            <GitCommit className="w-5 h-5" />
                            <h3 className="font-bold">Commits (20%)</h3>
                        </div>
                        <p className="text-sm text-zinc-500">
                            Consistent contribution matters. We analyze commit frequency and code volume over the last 12 months.
                        </p>
                    </div>
                </div>

                {/* Verification Note */}
                <div className="bg-zinc-900 text-white p-8 rounded-2xl space-y-4 shadow-xl">
                    <div className="flex items-center gap-3 text-[#EAB308]">
                        <Award className="w-6 h-6" />
                        <h3 className="text-xl font-bold">Verification</h3>
                    </div>
                    <p className="text-zinc-300">
                        To join the official leaderboard, you must verify your student status using a <b>@uwaterloo.ca</b> email address.
                        Once verified, your GitHub stats are synced daily.
                    </p>
                    <Button asChild className="bg-[#EAB308] text-black hover:bg-[#D9A307] font-bold">
                        <Link href="/verify">Get Verified</Link>
                    </Button>
                </div>

                {/* Footer */}
                <footer className="text-center pt-12">
                    <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest">
                        © UW GitRank 2026
                    </p>
                </footer>
            </div>
        </div>
    );
}
