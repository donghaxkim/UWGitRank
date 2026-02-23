"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BadgeCheck, Linkedin } from "lucide-react";
import { Tooltip } from "radix-ui";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Podium } from "@/components/Podium";
import type {
  LeaderboardEntry,
  RankedEntry,
  TimeWindow,
  Faculty,
} from "@/lib/leaderboard-shared";
import {
  getWindowScore,
  getWindowStats,
  getFaculty,
  TIME_WINDOW_LABELS,
} from "@/lib/leaderboard-shared";

export type { LeaderboardEntry };

const FACULTIES: Faculty[] = [
  "Engineering",
  "Math",
  "Environment",
  "Health",
  "Arts",
];

const TIME_WINDOWS: TimeWindow[] = ["7d", "30d", "1y", "all"];

function getDisplayName(entry: LeaderboardEntry): string {
  const fullName = `${entry.firstName ?? ""} ${entry.lastName ?? ""}`.trim();
  return fullName || entry.username;
}

export function LeaderboardTable({
  data,
  currentUserUsername,
}: {
  data: LeaderboardEntry[];
  currentUserUsername?: string;
}) {
  const [query, setQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<Faculty | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("30d");

  // Faculties present in the data
  const availableFaculties = useMemo(() => {
    const set = new Set<Faculty>();
    for (const e of data) {
      const f = getFaculty(e.program);
      if (f) set.add(f);
    }
    return FACULTIES.filter((f) => set.has(f));
  }, [data]);

  // Sort by selected window, assign ranks, then filter
  const ranked: RankedEntry[] = useMemo(() => {
    return [...data]
      .sort(
        (a, b) => getWindowScore(b, timeWindow) - getWindowScore(a, timeWindow),
      )
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [data, timeWindow]);

  const filtered = useMemo(() => {
    return ranked.filter((entry) => {
      if (query) {
        const q = query.toLowerCase();
        const matchUsername = entry.username.toLowerCase().includes(q);
        const matchFullName = getDisplayName(entry).toLowerCase().includes(q);
        if (!matchUsername && !matchFullName) return false;
      }
      if (facultyFilter && getFaculty(entry.program) !== facultyFilter) {
        return false;
      }
      return true;
    });
  }, [ranked, query, facultyFilter]);

  const podiumEntries = filtered.slice(0, 3);
  const tableEntries = filtered.slice(3);

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Time window selector */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-medium mr-1">
              Period:
            </span>
            {TIME_WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  timeWindow === w
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-zinc-200 text-muted-foreground hover:text-foreground"
                }`}
              >
                {TIME_WINDOW_LABELS[w]}
              </button>
            ))}
          </div>

          {/* Search + Faculty filter */}
          {availableFaculties.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground font-medium mr-1">
                Faculty:
              </span>
              <button
                onClick={() => setFacultyFilter(null)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  facultyFilter === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-zinc-200 text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {availableFaculties.map((f) => (
                <button
                  key={f}
                  onClick={() =>
                    setFacultyFilter(facultyFilter === f ? null : f)
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    facultyFilter === f
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-zinc-200 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or username..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Podium */}
        {podiumEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Podium entries={podiumEntries} timeWindow={timeWindow} />
          </motion.div>
        )}

        {/* Table (entries after top 3) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${timeWindow}-${facultyFilter}-${query}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200 hover:bg-transparent">
                  <TableHead className="w-[72px]">Rank</TableHead>
                  <TableHead>Contributor</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead className="text-right">Rank Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableEntries.length === 0 ? (
                  <TableRow className="border-zinc-200 hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {filtered.length === 0
                        ? "No contributors found."
                        : "All contributors shown in the podium above."}
                    </TableCell>
                  </TableRow>
                ) : (
                  tableEntries.map((entry, i) => {
                    const stats = getWindowStats(entry, timeWindow);
                    const isCurrentUser =
                      currentUserUsername &&
                      entry.username === currentUserUsername;

                    return (
                      <motion.tr
                        key={entry.username}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: Math.min(i * 0.03, 0.45),
                          ease: "easeOut",
                        }}
                        className={`border-b border-zinc-200 transition-colors ${
                          isCurrentUser
                            ? "bg-primary/10 hover:bg-primary/15 ring-1 ring-primary/30"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        <TableCell className="font-bold text-lg">
                          <span className="text-muted-foreground">
                            {entry.rank}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="inline-flex items-start gap-3 group">
                            <img
                              src={`https://github.com/${entry.username}.png`}
                              alt={entry.username}
                              width={32}
                              height={32}
                              className="rounded-full border border-zinc-200 transition-opacity group-hover:opacity-80"
                            />
                            <span className="min-w-0">
                              <span className="block font-medium truncate">
                                {getDisplayName(entry)}
                              </span>
                              <a
                                href={`https://github.com/${entry.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-muted-foreground transition-colors hover:text-yellow-600 hover:underline underline-offset-4"
                              >
                                @{entry.username}
                              </a>
                              {entry.linkedinUrl && (
                                <a
                                  href={entry.linkedinUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 hidden items-center gap-1 text-xs text-[#0A66C2] hover:underline group-hover:inline-flex"
                                >
                                  <Linkedin className="h-3 w-3" />
                                  <span>LinkedIn</span>
                                </a>
                              )}
                            </span>
                            {entry.is_verified && (
                              <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {entry.program ?? "—"}
                        </TableCell>

                        <TableCell className="text-right">
                          <ScoreTooltip
                            stars={entry.stars}
                            prs={stats.prs}
                            commits={stats.commits}
                            score={stats.score}
                            timeWindow={timeWindow}
                          />
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </motion.div>
        </AnimatePresence>
      </div>
    </Tooltip.Provider>
  );
}

function ScoreTooltip({
  stars,
  prs,
  commits,
  score,
  timeWindow,
}: {
  stars: number;
  prs: number;
  commits: number;
  score: number;
  timeWindow: TimeWindow;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className="cursor-default font-mono font-semibold tabular-nums">
          {score.toLocaleString()}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="rounded-lg bg-zinc-900 text-white px-3 py-2.5 text-xs shadow-lg z-50"
          sideOffset={5}
          side="left"
        >
          <div className="space-y-1 font-mono min-w-[140px]">
            <div className="flex justify-between gap-4">
              <span className="text-yellow-300">Stars ×10</span>
              <span>{(stars * 10).toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-blue-300">PRs ×5</span>
              <span>{(prs * 5).toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-green-300">Commits ×1</span>
              <span>{commits.toLocaleString()}</span>
            </div>
            <div className="border-t border-zinc-700 pt-1 flex justify-between gap-4 font-semibold">
              <span>Total</span>
              <span>{score.toLocaleString()}</span>
            </div>
            {timeWindow !== "all" && (
              <div className="text-[10px] text-zinc-500 pt-0.5">
                Stars are always all-time
              </div>
            )}
          </div>
          <Tooltip.Arrow className="fill-zinc-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
