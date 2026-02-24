const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export interface TopRepo {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  primaryLanguage: { name: string; color: string } | null;
}

type TopReposQueryData = {
  user: {
    repositories: {
      nodes: Array<{
        name: string;
        description: string | null;
        url: string;
        stargazerCount: number;
        primaryLanguage: { name: string; color: string } | null;
      }>;
    };
  } | null;
};

const topReposQuery = `
query($username: String!) {
  user(login: $username) {
    repositories(first: 5, ownerAffiliations: OWNER, isFork: false, orderBy: {field: STARGAZERS, direction: DESC}) {
      nodes {
        name
        description
        url
        stargazerCount
        primaryLanguage { name color }
      }
    }
  }
}
`;

// In-memory cache: username -> { data, timestamp }
const cache = new Map<string, { data: TopRepo[]; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchTopRepos(username: string): Promise<TopRepo[]> {
  const cached = cache.get(username);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN environment variable");
  }

  const res = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: topReposQuery, variables: { username } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const json: { data?: TopReposQueryData; errors?: Array<{ message: string }> } =
    await res.json();

  if (json.errors) {
    throw new Error(
      `GitHub GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`,
    );
  }

  const repos = json.data?.user?.repositories.nodes ?? [];

  cache.set(username, { data: repos, timestamp: Date.now() });

  return repos;
}
