"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BadgeCheck, Heart } from "lucide-react";
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
import { LeaderboardTooltipContent } from "@/components/LeaderboardTooltipContent";
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
import { ENDORSEMENT_WEIGHT } from "@/utils/ranking";
import { toggleEndorsement } from "@/app/auth/actions";

export type { LeaderboardEntry };

const FACULTIES: Faculty[] = [
  "Engineering",
  "Math",
  "Environment",
  "Health",
  "Other",
];

const FACULTY_LABELS: Record<Faculty, string> = {
  Engineering: "Faculty of Engineering",
  Math: "Faculty of Mathematics",
  Environment: "Faculty of Environment",
  Health: "Faculty of Health",
  Other: "Other",
};

const TIME_WINDOWS: TimeWindow[] = ["7d", "30d", "1y", "all"];

function getDisplayName(entry: LeaderboardEntry): string {
  const fullName = `${entry.firstName ?? ""} ${entry.lastName ?? ""}`.trim();
  return fullName || entry.username;
}

export function LeaderboardTable({
  data,
  currentUserUsername,
  isVerified = false,
  endorsedUsernames = [],
}: {
  data: LeaderboardEntry[];
  currentUserUsername?: string;
  isVerified?: boolean;
  endorsedUsernames?: string[];
}) {
  const [query, setQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<Faculty | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("30d");
  const [endorsedSet, setEndorsedSet] = useState<Set<string>>(
    () => new Set(endorsedUsernames),
  );
  const [countOverrides, setCountOverrides] = useState<Record<string, number>>(
    {},
  );
  const [, startTransition] = useTransition();

  const handleEndorse = useCallback(
    (username: string, currentCount: number) => {
      const wasEndorsed = endorsedSet.has(username);
      const optimisticCount = wasEndorsed
        ? currentCount - 1
        : currentCount + 1;

      setEndorsedSet((prev) => {
        const next = new Set(prev);
        if (wasEndorsed) next.delete(username);
        else next.add(username);
        return next;
      });
      setCountOverrides((prev) => ({ ...prev, [username]: optimisticCount }));

      startTransition(async () => {
        const result = await toggleEndorsement(username);
        if ("error" in result) {
          setEndorsedSet((prev) => {
            const reverted = new Set(prev);
            if (wasEndorsed) reverted.add(username);
            else reverted.delete(username);
            return reverted;
          });
          setCountOverrides((prev) => {
            const reverted = { ...prev };
            delete reverted[username];
            return reverted;
          });
        } else if (result.count !== undefined) {
          setCountOverrides((prev) => ({
            ...prev,
            [username]: result.count!,
          }));
        }
      });
    },
    [endorsedSet],
  );

  const getEffectiveCount = useCallback(
    (entry: LeaderboardEntry) =>
      countOverrides[entry.username] ?? (Number(entry.endorsement_count) || 0),
    [countOverrides],
  );

  const availableFaculties = FACULTIES;

  const effectiveData = useMemo(() => {
    return data.map((entry) => ({
      ...entry,
      endorsement_count: getEffectiveCount(entry),
    }));
  }, [data, getEffectiveCount]);

  // Sort by selected window, assign ranks, then filter
  const ranked: RankedEntry[] = useMemo(() => {
    return [...effectiveData]
      .sort(
        (a, b) => getWindowScore(b, timeWindow) - getWindowScore(a, timeWindow),
      )
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [effectiveData, timeWindow]);

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
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
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
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
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
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    facultyFilter === f
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-zinc-200 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {FACULTY_LABELS[f] ?? f}
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
                  <TableHead className="text-center w-[100px]">Endorse</TableHead>
                  <TableHead className="text-right">Rank Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableEntries.length === 0 ? (
                  <TableRow className="border-zinc-200 hover:bg-transparent">
                    <TableCell
                      colSpan={5}
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
                    const isEndorsed = endorsedSet.has(entry.username);
                    const canEndorse =
                      isVerified && !isCurrentUser && !!currentUserUsername;

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
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <div className="inline-flex items-start gap-3 group cursor-pointer">
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
                                  <span className="block text-xs text-muted-foreground">
                                    @{entry.username}
                                  </span>
                                </span>
                                {entry.is_verified && (
                                  <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                                )}
                              </div>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                className="rounded-lg bg-zinc-900 text-white px-3 py-2.5 text-xs shadow-lg z-50 max-w-[200px]"
                                sideOffset={8}
                                side="top"
                              >
                              <LeaderboardTooltipContent
                                entry={entry}
                                timeWindow={timeWindow}
                              />
                                <Tooltip.Arrow className="fill-zinc-900" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {entry.program ?? "—"}
                        </TableCell>

                        <TableCell className="text-center">
                          <EndorseButton
                            isEndorsed={isEndorsed}
                            count={entry.endorsement_count}
                            canEndorse={canEndorse}
                            onEndorse={() =>
                              handleEndorse(
                                entry.username,
                                entry.endorsement_count,
                              )
                            }
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <ScoreTooltip
                            stars={entry.stars}
                            prs={stats.prs}
                            commits={stats.commits}
                            endorsements={stats.endorsements}
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

function EndorseButton({
  isEndorsed,
  count,
  canEndorse,
  onEndorse,
}: {
  isEndorsed: boolean;
  count: number;
  canEndorse: boolean;
  onEndorse: () => void;
}) {
  return (
    <button
      onClick={canEndorse ? onEndorse : undefined}
      disabled={!canEndorse}
      className={`cursor-pointer inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
        canEndorse
          ? isEndorsed
            ? "bg-pink-50 text-pink-600 border border-pink-200 hover:bg-pink-100"
            : "bg-zinc-50 text-zinc-500 border border-zinc-200 hover:bg-zinc-100 hover:text-pink-500"
          : "text-zinc-400 border border-zinc-100 bg-zinc-50/50 cursor-default"
      }`}
      aria-label={isEndorsed ? "Remove endorsement" : "Endorse"}
    >
      <Heart
        className={`h-3.5 w-3.5 transition-colors ${
          isEndorsed ? "fill-pink-500 text-pink-500" : ""
        }`}
      />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}

function ScoreTooltip({
  stars,
  prs,
  commits,
  endorsements,
  score,
  timeWindow,
}: {
  stars: number;
  prs: number;
  commits: number;
  endorsements: number;
  score: number;
  timeWindow: TimeWindow;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className="cursor-pointer font-mono font-semibold tabular-nums">
          {score.toLocaleString()}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="rounded-lg bg-zinc-900 text-white px-3 py-2.5 text-xs shadow-lg z-50"
          sideOffset={5}
          side="left"
        >
          <div className="space-y-1 font-mono min-w-[160px]">
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
            <div className="flex justify-between gap-4">
              <span className="text-pink-300">Endorsements ×{ENDORSEMENT_WEIGHT}</span>
              <span>{(endorsements * ENDORSEMENT_WEIGHT).toLocaleString()}</span>
            </div>
            <div className="border-t border-zinc-700 pt-1 flex justify-between gap-4 font-semibold">
              <span>Total</span>
              <span>{score.toLocaleString()}</span>
            </div>
            {timeWindow !== "all" && (
              <div className="text-[10px] text-zinc-500 pt-0.5">
                Stars &amp; endorsements are always all-time
              </div>
            )}
          </div>
          <Tooltip.Arrow className="fill-zinc-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
