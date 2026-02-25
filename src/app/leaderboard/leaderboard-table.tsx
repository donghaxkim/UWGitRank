"use client";

import { useState, useMemo, useTransition, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BadgeCheck, Heart, Share2, Swords } from "lucide-react";
import { Tooltip } from "radix-ui";
import { Input } from "@/components/ui/input";
import { ShareProfileDialog } from "@/components/ShareProfileDialog";
import { BattleProfileModal } from "@/components/BattleProfileModal";
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
import { ENDORSEMENT_WEIGHT, ELO_WEIGHT } from "@/utils/ranking";
import { toggleEndorsement } from "@/app/auth/actions";

export type { LeaderboardEntry };

const FACULTIES: Faculty[] = [
  "Engineering",
  "Math",
  "Other",
];

const FACULTY_LABELS: Record<Faculty, string> = {
  Engineering: "Engineering",
  Math: "Mathematics",
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
  highlightUsername,
}: {
  data: LeaderboardEntry[];
  currentUserUsername?: string;
  isVerified?: boolean;
  endorsedUsernames?: string[];
  highlightUsername?: string;
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
  const [shareDialogEntry, setShareDialogEntry] = useState<{ entry: LeaderboardEntry; rank: number } | null>(null);
  const [battleProfileEntry, setBattleProfileEntry] = useState<LeaderboardEntry | null>(null);
  const [, startTransition] = useTransition();
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  // Scroll to highlighted user
  useEffect(() => {
    if (highlightUsername) {
      const element = rowRefs.current.get(highlightUsername);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }
    }
  }, [highlightUsername]);

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

  // Sort then filter, ranks are assigned within the filtered result
  const sorted = useMemo(() => {
    return [...effectiveData].sort(
      (a, b) => getWindowScore(b, timeWindow) - getWindowScore(a, timeWindow),
    );
  }, [effectiveData, timeWindow]);

  const filtered: RankedEntry[] = useMemo(() => {
    return sorted
      .filter((entry) => {
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
      })
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [sorted, query, facultyFilter]);

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
            <Podium
              entries={podiumEntries}
              timeWindow={timeWindow}
              endorsedSet={endorsedSet}
              currentUserUsername={currentUserUsername}
              isVerified={isVerified}
              onEndorse={(username) => {
                const entry = podiumEntries.find((e) => e.username === username);
                if (entry) handleEndorse(username, getEffectiveCount(entry));
              }}
              onShare={(entry, rank) => {
                setShareDialogEntry({ entry, rank });
              }}
              onBattleStats={(entry) => {
                setBattleProfileEntry(entry);
              }}
            />
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
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200 hover:bg-transparent">
                  <TableHead className="w-[52px] sm:w-[72px]">Rank</TableHead>
                  <TableHead>Contributor</TableHead>
                  <TableHead className="hidden md:table-cell">Program</TableHead>
                  <TableHead className="text-center w-[80px] sm:w-[100px]">Endorse</TableHead>
                  <TableHead className="text-right w-[80px] hidden sm:table-cell">ELO</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-center w-[50px] sm:w-[60px] hidden sm:table-cell">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableEntries.length === 0 ? (
                  <TableRow className="border-zinc-200 hover:bg-transparent">
                    <TableCell
                      colSpan={7}
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
                    const isHighlighted = highlightUsername === entry.username;
                    const isEndorsed = endorsedSet.has(entry.username);
                    const canEndorse =
                      isVerified && !isCurrentUser && !!currentUserUsername;

                    return (
                      <motion.tr
                        key={entry.username}
                        ref={(el: HTMLTableRowElement | null) => {
                          if (el) rowRefs.current.set(entry.username, el);
                        }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: Math.min(i * 0.03, 0.45),
                          ease: "easeOut",
                        }}
                        onClick={() => setBattleProfileEntry(entry)}
                        className={`border-b border-zinc-200 transition-colors cursor-pointer ${
                          isHighlighted
                            ? "bg-[#EAB308]/10 hover:bg-[#EAB308]/15 ring-2 ring-[#EAB308]/50"
                            : isCurrentUser
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
                              <a
                                href={`https://github.com/${entry.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-start gap-3 group cursor-pointer"
                              >
                                <img
                                  src={`https://github.com/${entry.username}.png`}
                                  alt={entry.username}
                                  width={32}
                                  height={32}
                                  className="rounded-full border border-zinc-200 transition-opacity group-hover:opacity-80"
                                />
                                <span className="min-w-0">
                                  <span className="flex justify-start items-center font-medium truncate group-hover:underline gap-1">
                                    {getDisplayName(entry)}
                                    {isCurrentUser && (
                                      <span className="text-primary font-semibold"> (you)</span>
                                    )}
                                    {entry.is_verified && (
                                      <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                                    )}
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    @{entry.username}
                                  </span>
                                </span>
                              </a>
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

                        <TableCell className="text-muted-foreground hidden md:table-cell">
                          {entry.program ?? "—"}
                        </TableCell>

                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
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

                        <TableCell className="text-right font-mono text-sm tabular-nums text-zinc-500 hidden sm:table-cell">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBattleProfileEntry(entry);
                              }}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-blue-100/50 transition-colors group cursor-pointer"
                              aria-label="View battle stats"
                              title="View Battle Stats"
                            >
                              <Swords className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
                            </button>
                            <span>{Math.round(entry.elo_rating)}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <ScoreTooltip
                            stars={entry.stars}
                            prs={stats.prs}
                            commits={stats.commits}
                            endorsements={stats.endorsements}
                            eloBonus={stats.eloBonus}
                            score={stats.score}
                            timeWindow={timeWindow}
                          />
                        </TableCell>

                        <TableCell className="text-center hidden sm:table-cell">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShareDialogEntry({ entry, rank: entry.rank });
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#EAB308]/10 transition-colors group cursor-pointer"
                            aria-label="Share profile"
                            title="Share Profile"
                          >
                            <Share2 className="w-4 h-4 text-zinc-400 group-hover:text-[#EAB308] transition-colors" />
                          </button>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Share Profile Dialog */}
      {shareDialogEntry && (
        <ShareProfileDialog
          isOpen={true}
          onClose={() => setShareDialogEntry(null)}
          entry={shareDialogEntry.entry}
          rank={shareDialogEntry.rank}
          timeWindow={timeWindow}
        />
      )}

      {/* Battle Profile Modal */}
      {battleProfileEntry && (
        <BattleProfileModal
          isOpen={true}
          onClose={() => setBattleProfileEntry(null)}
          entry={battleProfileEntry}
        />
      )}
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
  eloBonus,
  score,
  timeWindow,
}: {
  stars: number;
  prs: number;
  commits: number;
  endorsements: number;
  eloBonus: number;
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
            <div className="flex justify-between gap-4">
              <span className="text-orange-300">ELO ×{ELO_WEIGHT}</span>
              <span>{eloBonus > 0 ? "+" : ""}{eloBonus.toLocaleString()}</span>
            </div>
            <div className="border-t border-zinc-700 pt-1 flex justify-between gap-4 font-semibold">
              <span>Total</span>
              <span>{score.toLocaleString()}</span>
            </div>
            {timeWindow !== "all" && (
              <div className="text-[10px] text-zinc-500 pt-0.5">
                Stars, endorsements &amp; ELO are always all-time
              </div>
            )}
          </div>
          <Tooltip.Arrow className="fill-zinc-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
