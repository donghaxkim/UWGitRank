"use client";

import { useState } from "react";
import { Search, Trophy, BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  program: string | null;
  rank_score: number;
}

const PROGRAM_SHORT: Record<string, string> = {
  "Software Engineering": "SE",
  "Computer Science": "CS",
  "Computer Engineering": "CE",
  "Mathematics": "Math",
  "Computing and Financial Management": "CFM",
  "Data Science": "DS",
  "Electrical Engineering": "EE",
  "Mechatronics Engineering": "Tron",
  "Systems Design Engineering": "SYDE",
  "Management Engineering": "MSCI",
  "Biomedical Engineering": "BME",
  "Statistics": "Stats",
  "Combinatorics and Optimization": "C&O",
  "Applied Mathematics": "AM",
  "Computational Mathematics": "CM",
  "Mathematical Finance": "MF",
  "Geomatics": "Geom",
  "Information Technology Management": "ITM",
};

function shortProgram(program: string): string {
  return PROGRAM_SHORT[program] ?? program;
}

const TROPHY_COLORS: Record<number, string> = {
  1: "text-yellow-500",
  2: "text-zinc-400",
  3: "text-amber-700",
};

export function LeaderboardTable({ data }: { data: LeaderboardEntry[] }) {
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState<string | null>(null);

  // Unique programs present in the data
  const programs = Array.from(
    new Set(data.map((e) => e.program).filter((p): p is string => p !== null))
  ).sort();

  const filtered = data.filter((entry) => {
    if (query && !entry.username.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    if (programFilter && entry.program !== programFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {programs.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setProgramFilter(null)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${programFilter === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-zinc-200 text-muted-foreground hover:text-foreground"
                }`}
            >
              All
            </button>
            {programs.map((p) => (
              <button
                key={p}
                onClick={() =>
                  setProgramFilter(programFilter === p ? null : p)
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${programFilter === p
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-zinc-200 text-muted-foreground hover:text-foreground"
                  }`}
              >
                <span className="hidden md:inline">{p}</span>
                <span className="md:hidden">{shortProgram(p)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 hover:bg-transparent">
              <TableHead className="w-[72px]">Rank</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Program</TableHead>
              <TableHead className="text-right">GitRank Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-zinc-200 hover:bg-transparent">
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => (
                <TableRow
                  key={entry.username}
                  className="border-zinc-200 hover:bg-muted/30 transition-colors"
                >
                  {/* Rank */}
                  <TableCell className="font-bold text-lg">
                    {entry.rank <= 3 ? (
                      <span className="inline-flex items-center gap-1">
                        <Trophy
                          className={`w-4 h-4 ${TROPHY_COLORS[entry.rank]}`}
                        />
                        <span className={TROPHY_COLORS[entry.rank]}>
                          {entry.rank}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {entry.rank}
                      </span>
                    )}
                  </TableCell>

                  {/* Student */}
                  <TableCell>
                    <a
                      href={`https://github.com/${entry.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 group"
                    >
                      <img
                        src={
                          entry.avatar_url ??
                          `https://github.com/${entry.username}.png`
                        }
                        alt={entry.username}
                        width={32}
                        height={32}
                        className="rounded-full border border-zinc-200 transition-opacity group-hover:opacity-80"
                      />
                      <span className="font-medium transition-colors group-hover:text-yellow-500 group-hover:underline underline-offset-4">
                        {entry.username}
                      </span>
                      {entry.is_verified && (
                        <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </a>
                  </TableCell>

                  {/* Program — short on mobile, full on desktop */}
                  <TableCell className="text-muted-foreground">
                    {entry.program ? (
                      <>
                        <span className="hidden md:inline">{entry.program}</span>
                        <span className="md:hidden">{shortProgram(entry.program)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Impact Score */}
                  <TableCell className="text-right font-mono font-semibold tabular-nums">
                    {entry.rank_score.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
