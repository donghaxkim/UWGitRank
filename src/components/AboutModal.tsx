"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { X, Github, Star, GitPullRequest, GitCommit, Heart, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

export function AboutModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="cursor-pointer text-[11px] font-mono text-zinc-400 uppercase tracking-widest font-medium hover:text-zinc-900 transition-colors"
        >
          About
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] sm:w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
            "bg-[#f2f2f2] text-zinc-900 rounded-2xl shadow-2xl border border-zinc-200",
            "max-h-[85vh] overflow-y-auto p-4 sm:p-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "duration-200",
          )}
        >
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center shrink-0">
                <Github className="w-5 h-5 text-[#EAB308]" />
              </div>
              <div>
                <Dialog.Title className="text-xl font-bold tracking-tight">
                  UW GitRank
                </Dialog.Title>
                <Dialog.Description className="text-sm text-zinc-500">
                  Check your Open-Source Aura.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="cursor-pointer p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-6 text-sm">
            {/* What it is */}
            <section>
              <h3 className="font-semibold text-zinc-900 mb-2">
                What is UW GitRank?
              </h3>
              <p className="text-zinc-600 leading-relaxed">
                UW GitRank is a leaderboard that ranks University of Waterloo
                students by their open-source impact on GitHub. We pull data
                from the GitHub API and score contributions using stars, merged
                pull requests, commits, and peer endorsements to give you a
                snapshot of who&apos;s making waves in open source.
              </p>
            </section>

            {/* How it works */}
            <section>
              <h3 className="font-semibold text-zinc-900 mb-2">
                How the ranking works
              </h3>
              <p className="text-zinc-600 leading-relaxed mb-3">
                Your rank score is calculated with a weighted formula:
              </p>
              <div className="bg-zinc-900 text-white rounded-xl p-4 font-mono text-xs space-y-1.5">
                <p>
                  <span className="text-yellow-300">stars</span> × 10
                </p>
                <p>
                  <span className="text-blue-300">merged PRs</span> × 5
                </p>
                <p>
                  <span className="text-green-300">commits</span> × 1
                </p>
                <p>
                  <span className="text-pink-300">endorsements</span> × 3
                </p>
                <p>
                  <span className="text-orange-300">(ELO − 1200)</span> × 0.5
                </p>
              </div>
              <p className="text-zinc-500 text-xs mt-2">
                Stars count on non-forked repos you own. GitHub data syncs
                nightly. Endorsements update in real-time. ELO starts at
                1200 and changes based on community votes in Battle mode.
              </p>
            </section>

            {/* Metrics quick ref */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 border border-zinc-200">
                <Star className="w-4 h-4 text-yellow-600 mb-1" />
                <p className="font-medium text-zinc-900">Stars</p>
                <p className="text-xs text-zinc-500">×10 pts</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-zinc-200">
                <GitPullRequest className="w-4 h-4 text-blue-600 mb-1" />
                <p className="font-medium text-zinc-900">Merged PRs</p>
                <p className="text-xs text-zinc-500">×5 pts</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-zinc-200">
                <GitCommit className="w-4 h-4 text-green-600 mb-1" />
                <p className="font-medium text-zinc-900">Commits</p>
                <p className="text-xs text-zinc-500">×1 pt</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-zinc-200">
                <Heart className="w-4 h-4 text-pink-600 mb-1" />
                <p className="font-medium text-zinc-900">Endorsements</p>
                <p className="text-xs text-zinc-500">×3 pts</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-zinc-200 col-span-2">
                <Swords className="w-4 h-4 text-orange-600 mb-1" />
                <p className="font-medium text-zinc-900">ELO Rating</p>
                <p className="text-xs text-zinc-500">(ELO − 1200) × 0.5 pts</p>
              </div>
            </div>

            {/* Creators */}
            <section className="text-center">
              <h3 className="font-semibold text-zinc-900">Built by</h3>
              <p className="text-zinc-600 leading-relaxed">
                Made by{" "}
                <a
                  href="https://www.linkedin.com/in/dongha-kimm/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer underline underline-offset-2 hover:text-zinc-900 transition-colors"
                >
                  Dongha Kim
                </a>{" "}
                &{" "}
                <a
                  href="https://www.linkedin.com/in/brian-an06/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer underline underline-offset-2 hover:text-zinc-900 transition-colors"
                >
                  Brian An
                </a>
                .
              </p>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
