"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { Tooltip } from "radix-ui";
import type { RankedEntry, TimeWindow } from "@/lib/leaderboard-shared";
import { getWindowStats, TIME_WINDOW_LABELS } from "@/lib/leaderboard-shared";

const PLACE_STYLES: Record<number, { card: string; height: string }> = {
  1: { card: "card-holographic", height: "h-28" },
  2: { card: "card-silver", height: "h-20" },
  3: { card: "card-bronze", height: "h-14" },
};

const PLACE_DELAYS: Record<number, number> = { 2: 0, 1: 0.15, 3: 0.3 };

function getDisplayName(entry: RankedEntry): string {
  const fullName = `${entry.firstName ?? ""} ${entry.lastName ?? ""}`.trim();
  return fullName || entry.username;
}

function PodiumCard({
  entry,
  place,
  timeWindow,
}: {
  entry: RankedEntry;
  place: number;
  timeWindow: TimeWindow;
}) {
  const style = PLACE_STYLES[place];
  const stats = getWindowStats(entry, timeWindow);
  const delay = PLACE_DELAYS[place] ?? 0;
  const windowLabel = TIME_WINDOW_LABELS[timeWindow];

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-semibold text-white border-b border-zinc-700 pb-1">
        {getDisplayName(entry)}
      </div>
      <div className="text-[10px] text-zinc-400">{windowLabel} · Score breakdown</div>
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
        <div className="border-t border-zinc-700 pt-1 flex justify-between gap-4 font-semibold">
          <span>Total</span>
          <span>{stats.score.toLocaleString()}</span>
        </div>
      </div>
      <div className="text-[10px] text-zinc-500 pt-0.5">
        All-time: {entry.commits_all} commits · {entry.prs_all} PRs · {entry.stars} stars
      </div>
      <a
        href={`https://github.com/${entry.username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-[10px] text-[#EAB308] hover:underline pt-1"
        onClick={(e) => e.stopPropagation()}
      >
        GitHub: @{entry.username}
      </a>
      {entry.linkedinUrl && (
        <a
          href={entry.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[10px] text-[#0A66C2] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          LinkedIn profile →
        </a>
      )}
    </div>
  );

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <motion.div
          className="flex flex-col items-center gap-2 min-w-0 cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay, ease: "easeOut" }}
        >
          {/* Avatar with colored ring */}
          <motion.div
            className={`rounded-full p-[3px] ${style.card}`}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: delay + 0.15,
              type: "spring",
              stiffness: 200,
              damping: 18,
            }}
          >
            <img
              src={`https://github.com/${entry.username}.png`}
              alt={entry.username}
              width={place === 1 ? 72 : 56}
              height={place === 1 ? 72 : 56}
              className="rounded-full border-2 border-white bg-white"
            />
          </motion.div>

          {/* Name & score */}
          <div className="text-center min-w-0 max-w-[120px]">
            <div className="font-bold text-sm truncate">
              {getDisplayName(entry)}
            </div>
            <div className="text-xs font-mono font-semibold mt-0.5 tabular-nums">
              {stats.score.toLocaleString()} pts
            </div>
          </div>

          {/* Pedestal */}
          <motion.div
            className={`w-24 sm:w-28 ${style.height} rounded-t-xl flex items-center justify-center ${style.card} origin-bottom`}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{
              delay: delay + 0.1,
              type: "spring",
              stiffness: 160,
              damping: 20,
            }}
          >
            <Trophy
              className={`w-6 h-6 ${place === 1 ? "text-white" : "text-white/80"}`}
            />
          </motion.div>
        </motion.div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="rounded-lg bg-zinc-900 text-white px-3 py-2.5 text-xs shadow-lg z-50 max-w-[200px]"
          sideOffset={8}
          side="top"
        >
          {tooltipContent}
          <Tooltip.Arrow className="fill-zinc-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function Podium({
  entries,
  timeWindow,
}: {
  entries: RankedEntry[];
  timeWindow: TimeWindow;
}) {
  if (entries.length === 0) return null;

  const first = entries[0];
  const second = entries.length > 1 ? entries[1] : null;
  const third = entries.length > 2 ? entries[2] : null;

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6 pt-4 pb-2">
      {/* 2nd place — left */}
      {second ? (
        <PodiumCard entry={second} place={2} timeWindow={timeWindow} />
      ) : (
        <div className="w-24 sm:w-28" />
      )}

      {/* 1st place — center */}
      <PodiumCard entry={first} place={1} timeWindow={timeWindow} />

      {/* 3rd place — right */}
      {third ? (
        <PodiumCard entry={third} place={3} timeWindow={timeWindow} />
      ) : (
        <div className="w-24 sm:w-28" />
      )}
    </div>
  );
}
