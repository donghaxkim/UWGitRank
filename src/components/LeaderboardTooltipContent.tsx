"use client";

import type { LeaderboardEntry, TimeWindow } from "@/lib/leaderboard-shared";
import { getWindowStats, TIME_WINDOW_LABELS } from "@/lib/leaderboard-shared";
import { ENDORSEMENT_WEIGHT } from "@/utils/ranking";

function getDisplayName(entry: LeaderboardEntry): string {
  const fullName = `${entry.firstName ?? ""} ${entry.lastName ?? ""}`.trim();
  return fullName || entry.username;
}

export function LeaderboardTooltipContent({
  entry,
  timeWindow,
}: {
  entry: LeaderboardEntry;
  timeWindow: TimeWindow;
}) {
  const stats = getWindowStats(entry, timeWindow);
  const windowLabel = TIME_WINDOW_LABELS[timeWindow];

  return (
    <div className="space-y-2">
      <div className="font-semibold text-white border-b border-zinc-700 pb-1">
        {getDisplayName(entry)}
      </div>
      <div className="text-[10px] text-zinc-400">
        {windowLabel} · Score breakdown
      </div>
      <div className="space-y-1 font-mono text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-yellow-300">Stars ×10</span>
          <span>{(entry.stars * 10).toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-blue-300">PRs ×5</span>
          <span>{(stats.prs * 5).toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-green-300">Commits ×1</span>
          <span>{stats.commits.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-pink-300">
            Endorsements ×{ENDORSEMENT_WEIGHT}
          </span>
          <span>
            {(stats.endorsements * ENDORSEMENT_WEIGHT).toLocaleString()}
          </span>
        </div>
        <div className="border-t border-zinc-700 pt-1 flex justify-between gap-4 font-semibold">
          <span>Total</span>
          <span>{stats.score.toLocaleString()}</span>
        </div>
      </div>
      {timeWindow !== "all" && (
        <div className="text-[10px] text-zinc-500 pt-0.5">
          Stars &amp; endorsements are always all-time
        </div>
      )}
      <div className="text-[10px] text-zinc-500 pt-0.5">
        All-time: {entry.commits_all} commits · {entry.prs_all} PRs · {entry.stars}{" "}
        stars
      </div>
      <a
        href={`https://github.com/${entry.username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-pointer block text-[10px] text-[#EAB308] hover:underline pt-1"
        onClick={(e) => e.stopPropagation()}
      >
        GitHub: @{entry.username}
      </a>
      {entry.linkedinUrl && (
        <a
          href={entry.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer block text-[10px] text-[#0A66C2] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          LinkedIn profile →
        </a>
      )}
    </div>
  );
}

