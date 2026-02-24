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
 *
 * We compute endorsement_count via a subquery on the endorsements table
 * rather than relying on the materialized view column, so the query works
 * even before the materialized view is recreated after migration.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    return await prisma.$queryRaw<LeaderboardEntry[]>`
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
        COALESCE(ec.cnt, 0)::int AS endorsement_count,
        COALESCE(gm.elo_rating, 1200)::float AS elo_rating
      FROM public.leaderboard l
      LEFT JOIN public.profiles p
        ON p.username = l.username
      LEFT JOIN public.github_metrics gm
        ON gm.user_id = p.id
      LEFT JOIN (
        SELECT target_user_id, COUNT(*)::int AS cnt
        FROM public.endorsements
        GROUP BY target_user_id
      ) ec ON ec.target_user_id = p.id
    `;
  } catch {
    // Endorsements table may not exist yet — fall back without it
    const rows = await prisma.$queryRaw<LeaderboardEntry[]>`
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
        l.score_1y
      FROM public.leaderboard l
      LEFT JOIN public.profiles p
        ON p.username = l.username
    `;
    return rows.map((r) => ({ ...r, endorsement_count: 0, elo_rating: 1200 }));
  }
}

/**
 * Refresh the `leaderboard` materialized view concurrently.
 */
export async function refreshLeaderboard(): Promise<void> {
  await prisma.$executeRaw`SELECT refresh_leaderboard()`;
}
