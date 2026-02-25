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

/** Mock data used when DATABASE_URL is not configured. */
function getMockLeaderboard(): LeaderboardEntry[] {
  const programs = [
    "Software Engineering",
    "Computer Science",
    "Electrical & Computer Eng",
    "Mechatronics Engineering",
    "Mathematics",
    "Computer Science",
    "Systems Design Engineering",
    "Software Engineering",
    "Data Science",
    "Computer Science",
    "Mechanical Engineering",
    "Computer Science",
  ];
  const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah", "Ivan", "Julia", "Kevin", "Liam"];
  const lastNames = ["Chen", "Patel", "Kim", "Rodriguez", "Nguyen", "Singh", "Tanaka", "Mueller", "Okafor", "Li", "Brown", "Davis"];
  return Array.from({ length: 12 }, (_, i) => ({
    username: `dev-${firstNames[i].toLowerCase()}${i}`,
    firstName: firstNames[i],
    lastName: lastNames[i],
    linkedinUrl: null,
    is_verified: i < 8,
    program: programs[i],
    stars: Math.round(500 - i * 35 + Math.random() * 20),
    commits_all: Math.round(1500 - i * 100 + Math.random() * 50),
    prs_all: Math.round(60 - i * 4 + Math.random() * 5),
    score_all: Math.round(9000 - i * 600 + Math.random() * 100),
    commits_7d: Math.round(50 - i * 3 + Math.random() * 10),
    prs_7d: Math.max(0, Math.round(5 - i * 0.4 + Math.random() * 2)),
    score_7d: Math.round(800 - i * 55 + Math.random() * 30),
    commits_30d: Math.round(200 - i * 12 + Math.random() * 20),
    prs_30d: Math.max(0, Math.round(15 - i + Math.random() * 3)),
    score_30d: Math.round(3000 - i * 200 + Math.random() * 50),
    commits_1y: Math.round(1000 - i * 70 + Math.random() * 40),
    prs_1y: Math.round(45 - i * 3 + Math.random() * 4),
    score_1y: Math.round(7000 - i * 450 + Math.random() * 80),
    endorsement_count: Math.max(0, Math.round(20 - i * 2 + Math.random() * 5)),
    elo_rating: Math.round(1400 - i * 20 + Math.random() * 30),
  }));
}

/**
 * Fetch all rows from the `leaderboard` materialized view.
 * Prisma doesn't support materialized views natively, so we use $queryRaw.
 *
 * We compute endorsement_count via a subquery on the endorsements table
 * rather than relying on the materialized view column, so the query works
 * even before the materialized view is recreated after migration.
 *
 * Returns mock data when DATABASE_URL is not set (local dev without env vars).
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!process.env.DATABASE_URL) {
    return getMockLeaderboard();
  }

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
