const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export interface GitHubStats {
  stars: number;
  commits: number;
  mergedPRs: number;
}

export interface GitHubData {
  stars: number;
  commitsAll: number;
  mergedPRsAll: number;
  commits7d: number;
  commits30d: number;
  commits1y: number;
  prs7d: number;
  prs30d: number;
  prs1y: number;
}

type AllTimeQueryData = {
  user: {
    repositories: {
      nodes: Array<{
        stargazerCount: number;
        defaultBranchRef?: { target?: { history?: { totalCount: number } } };
      }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
    pullRequests: {
      totalCount: number;
      nodes: Array<{ mergedAt: string | null }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } | null;
};

type RepositoriesWithCommitsData = {
  user: {
    repositories: {
      nodes: Array<{
        name: string;
        stargazerCount: number;
        defaultBranchRef?: {
          target?: {
            history?: {
              pageInfo: { hasNextPage: boolean; endCursor: string | null };
              nodes: Array<{
                committedDate: string;
              }>;
              totalCount: number;
            };
          };
        };
      }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } | null;
};

// All-time query: stars and commits from repos with 3+ stars, merged PRs
const allTimeQuery = `
query($username: String!, $prCursor: String) {
  user(login: $username) {
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      nodes {
        stargazerCount
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 1) {
                totalCount
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    pullRequests(states: MERGED, first: 100, after: $prCursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
      totalCount
      nodes {
        mergedAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
`;

// Query for windowed commits from repos with 3+ stars
const windowedRepositoriesQuery = `
query($username: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $username) {
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      nodes {
        name
        stargazerCount
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100, since: $from, until: $to) {
                totalCount
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  committedDate
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
`;

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN environment variable");
  }
  return token;
}

export async function graphql<T>(
  queryStr: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const token = getToken();

  const res = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: queryStr, variables }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const json: { data?: T; errors?: Array<{ message: string }> } =
    await res.json();

  if (json.errors) {
    throw new Error(
      `GitHub GraphQL error: ${json.errors.map((e: { message: string }) => e.message).join(", ")}`
    );
  }

  if (!json.data) {
    throw new Error("GitHub GraphQL error: Missing response data");
  }

  return json.data;
}

const MIN_STARS = 3; // Only count commits from repos with 3+ stars

/**
 * Fetch all-time stats including paginated merged PR dates (up to 500 PRs).
 * Only counts commits from repositories with 3+ stars to prevent spoofing.
 */
async function fetchAllTimeWithPRs(username: string): Promise<{
  stars: number;
  commits: number;
  mergedPRsTotal: number;
  prMergedDates: Date[];
}> {
  const prMergedDates: Date[] = [];
  let prCursor: string | null = null;
  let stars = 0;
  let commits = 0;
  let mergedPRsTotal = 0;
  const MAX_PR_PAGES = 5; // 5 pages × 100 = 500 PRs max

  for (let page = 0; page < MAX_PR_PAGES; page++) {
    const data: AllTimeQueryData = await graphql(allTimeQuery, {
      username,
      prCursor,
    });

    const user = data.user;
    if (!user) {
      throw new Error(`GitHub user "${username}" not found`);
    }

    // Only read stars/commits on first page
    if (page === 0) {
      // Sum all stars
      stars = user.repositories.nodes.reduce(
        (sum: number, repo: { stargazerCount: number }) => sum + repo.stargazerCount,
        0
      );

      // Only count commits from repos with 3+ stars
      commits = user.repositories.nodes.reduce((sum: number, repo) => {
        if (repo.stargazerCount >= MIN_STARS) {
          const commitCount = repo.defaultBranchRef?.target?.history?.totalCount || 0;
          return sum + commitCount;
        }
        return sum;
      }, 0);

      mergedPRsTotal = user.pullRequests.totalCount;
    }

    for (const pr of user.pullRequests.nodes) {
      if (pr.mergedAt) {
        prMergedDates.push(new Date(pr.mergedAt));
      }
    }

    if (!user.pullRequests.pageInfo.hasNextPage) break;
    prCursor = user.pullRequests.pageInfo.endCursor;
  }

  return { stars, commits, mergedPRsTotal, prMergedDates };
}

/**
 * Fetch commit count for a specific time window from repos with 3+ stars.
 */
async function fetchWindowedCommits(
  username: string,
  from: string,
  to: string
): Promise<number> {
  const data: RepositoriesWithCommitsData = await graphql(
    windowedRepositoriesQuery,
    {
      username,
      from,
      to,
    }
  );

  const user = data.user;
  if (!user) {
    throw new Error(`GitHub user "${username}" not found`);
  }

  // Sum commits from repos with 3+ stars
  return user.repositories.nodes.reduce((sum: number, repo) => {
    if (repo.stargazerCount >= MIN_STARS) {
      const commitCount = repo.defaultBranchRef?.target?.history?.totalCount || 0;
      return sum + commitCount;
    }
    return sum;
  }, 0);
}

function countPRsInWindow(prDates: Date[], windowStart: Date): number {
  return prDates.filter((d) => d >= windowStart).length;
}

/**
 * Fetch all GitHub data needed for rank scores in every time window.
 * Returns: stars (all-time), commits and merged PRs for 7d / 30d / 1y / all-time.
 * Only counts commits from repositories with 3+ stars to prevent spoofing.
 * Used by sync to compute score_7d, score_30d, score_1y, and score_all with the
 * same formula (stars×10 + PRs×5 + commits×1). Makes 4 parallel API calls per user.
 */
export async function fetchGitHubData(username: string): Promise<GitHubData> {
  const now = new Date();
  const from7d = new Date(now.getTime() - 7 * 86400_000).toISOString();
  const from30d = new Date(now.getTime() - 30 * 86400_000).toISOString();
  const from1y = new Date(now.getTime() - 365 * 86400_000).toISOString();
  const toStr = now.toISOString();

  const [allTime, c7d, c30d, c1y] = await Promise.all([
    fetchAllTimeWithPRs(username),
    fetchWindowedCommits(username, from7d, toStr),
    fetchWindowedCommits(username, from30d, toStr),
    fetchWindowedCommits(username, from1y, toStr),
  ]);

  const windowStart7d = new Date(now.getTime() - 7 * 86400_000);
  const windowStart30d = new Date(now.getTime() - 30 * 86400_000);
  const windowStart1y = new Date(now.getTime() - 365 * 86400_000);

  return {
    stars: allTime.stars,
    commitsAll: allTime.commits,
    mergedPRsAll: allTime.mergedPRsTotal,
    commits7d: c7d,
    commits30d: c30d,
    commits1y: c1y,
    prs7d: countPRsInWindow(allTime.prMergedDates, windowStart7d),
    prs30d: countPRsInWindow(allTime.prMergedDates, windowStart30d),
    prs1y: countPRsInWindow(allTime.prMergedDates, windowStart1y),
  };
}

/**
 * Legacy function for backward compatibility.
 */
export async function fetchGitHubStats(
  username: string
): Promise<GitHubStats> {
  const data = await fetchGitHubData(username);
  return {
    stars: data.stars,
    commits: data.commitsAll,
    mergedPRs: data.mergedPRsAll,
  };
}
