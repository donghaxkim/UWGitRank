export const STAR_WEIGHT = 10;
export const PR_WEIGHT = 5;
export const COMMIT_WEIGHT = 1;
export const ENDORSEMENT_WEIGHT = 3;

/**
 * Waterloo GitRank score formula: stars×10 + PRs×5 + commits×1.
 * Used for every time window (7d, 30d, 1y, all). Stars are always all-time;
 * prs and commits are for the specific window when computing windowed scores.
 *
 * Endorsement points are added separately at the display/sorting layer
 * because they are not time-windowed.
 */
export function calculateWaterlooScore(stats: {
  stars: number;
  prs: number;
  commits: number;
}) {
  return stats.stars * STAR_WEIGHT + stats.prs * PR_WEIGHT + stats.commits * COMMIT_WEIGHT;
}
