import { prisma } from "@/lib/prisma";
import type { LeaderboardEntry } from "./leaderboard-shared";

export type {
  TimeWindow,
  LeaderboardEntry,
  RankedEntry,
  Faculty,
} from "./leaderboard-shared";

export {
  getWindowScore,
  getWindowStats,
  TIME_WINDOW_LABELS,
  getFaculty,
} from "./leaderboard-shared";

/**
 * Fetch all rows from the `leaderboard` materialized view.
 * Prisma doesn't support materialized views natively, so we use $queryRaw.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  return prisma.$queryRaw<LeaderboardEntry[]>`
    SELECT
      l.username,
      p.first_name AS "firstName",
      p.last_name AS "lastName",
      p.linkedin_url AS "linkedinUrl",
      l.is_verified,
      l.program,
      l.stars,
      l.commits_all,
      l.prs_all,
      l.score_all,
      l.commits_7d,
      l.prs_7d,
      l.score_7d,
      l.commits_30d,
      l.prs_30d,
      l.score_30d,
      l.commits_1y,
      l.prs_1y,
      l.score_1y,
      l.endorsement_count
    FROM public.leaderboard l
    LEFT JOIN public.profiles p
      ON p.username = l.username
  `;
}

/**
 * Refresh the `leaderboard` materialized view concurrently.
 */
export async function refreshLeaderboard(): Promise<void> {
  await prisma.$executeRaw`SELECT refresh_leaderboard()`;
}
