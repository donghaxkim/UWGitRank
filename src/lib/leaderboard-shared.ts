export type TimeWindow = "7d" | "30d" | "1y" | "all";

export interface LeaderboardEntry {
  username: string;
  firstName: string | null;
  lastName: string | null;
  linkedinUrl: string | null;
  is_verified: boolean;
  program: string | null;
  stars: number;
  commits_all: number;
  prs_all: number;
  score_all: number;
  commits_7d: number;
  prs_7d: number;
  score_7d: number;
  commits_30d: number;
  prs_30d: number;
  score_30d: number;
  commits_1y: number;
  prs_1y: number;
  score_1y: number;
}

export interface RankedEntry extends LeaderboardEntry {
  rank: number;
}

export function getWindowScore(
  entry: LeaderboardEntry,
  window: TimeWindow,
): number {
  switch (window) {
    case "7d":
      return entry.score_7d;
    case "30d":
      return entry.score_30d;
    case "1y":
      return entry.score_1y;
    case "all":
      return entry.score_all;
  }
}

export function getWindowStats(entry: LeaderboardEntry, window: TimeWindow) {
  switch (window) {
    case "7d":
      return {
        commits: entry.commits_7d,
        prs: entry.prs_7d,
        score: entry.score_7d,
      };
    case "30d":
      return {
        commits: entry.commits_30d,
        prs: entry.prs_30d,
        score: entry.score_30d,
      };
    case "1y":
      return {
        commits: entry.commits_1y,
        prs: entry.prs_1y,
        score: entry.score_1y,
      };
    case "all":
      return {
        commits: entry.commits_all,
        prs: entry.prs_all,
        score: entry.score_all,
      };
  }
}

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "1y": "1 year",
  all: "All time",
};

export type Faculty =
  | "Engineering"
  | "Math"
  | "Environment"
  | "Health"
  | "Arts";

  const FACULTY_MAP: Record<string, Faculty> = {
    // Faculty of Engineering
    "Software Engineering": "Engineering",
    "Computer Engineering": "Engineering",
    "Electrical Engineering": "Engineering",
    "Mechatronics Engineering": "Engineering",
    "Systems Design Engineering": "Engineering",
    "Management Engineering": "Engineering",
    "Biomedical Engineering": "Engineering",
    "Chemical Engineering": "Engineering",
    "Civil Engineering": "Engineering",
    "Environmental Engineering": "Engineering",
    "Geological Engineering": "Engineering",
    "Mechanical Engineering": "Engineering",
    "Nanotechnology Engineering": "Engineering",
    "Architectural Engineering": "Engineering",
  
    // Faculty of Mathematics (Filtered)
    "Computer Science": "Math",
    "Mathematics": "Math",
    "Computing and Financial Management": "Math",
};

/** Ordered list of program names for signup dropdown (matches leaderboard faculty mapping). */
export const PROGRAM_OPTIONS = Object.keys(FACULTY_MAP).sort();

export function getFaculty(program: string | null): Faculty | null {
  if (!program) return null;
  if (FACULTY_MAP[program]) return FACULTY_MAP[program];
  const lower = program.toLowerCase();
  if (lower.includes("engineering")) return "Engineering";
  if (
    lower.includes("health") ||
    lower.includes("kinesiology") ||
    lower.includes("recreation") ||
    lower.includes("public health")
  )
    return "Health";
  return "Arts";
}
