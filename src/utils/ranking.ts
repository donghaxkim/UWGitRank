export const STAR_WEIGHT = 10;
export const PR_WEIGHT = 5;
export const COMMIT_WEIGHT = 1;
export const ENDORSEMENT_WEIGHT = 3;
export const ELO_WEIGHT = 0.5;
export const ELO_BASELINE = 1200;

/**
 * Waterloo GitRank score formula: stars×10 + PRs×5 + commits×1 + endorsements×3 + (ELO−1200)×0.5.
 * Base score (stars, PRs, commits) is used for every time window (7d, 30d, 1y, all).
 * Stars are always all-time; PRs and commits are for the specific window.
 *
 * Endorsement and ELO bonus are added at the display/sorting layer
 * because they are not time-windowed.
 */
export function calculateWaterlooScore(stats: {
  stars: number;
  prs: number;
  commits: number;
}) {
  return stats.stars * STAR_WEIGHT + stats.prs * PR_WEIGHT + stats.commits * COMMIT_WEIGHT;
}
