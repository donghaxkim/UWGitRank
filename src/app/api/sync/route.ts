import { fetchGitHubData } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { refreshLeaderboard } from "@/lib/leaderboard";
import { calculateWaterlooScore } from "@/utils/ranking";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Protect with a shared secret so only your cron can call this
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Get all verified users
  const users = await prisma.profile.findMany({
    where: { isVerified: true },
    select: { id: true, githubUsername: true },
  });

  if (users.length === 0) {
    return NextResponse.json({
      message: "No verified users to sync",
      synced: 0,
    });
  }

  const CHUNK_SIZE = 5; // Nuke concurrent reqs
  const results: { username: string | null; status: string }[] = [];

  // 2. Process users in parallel chunks to avoid Vercel timeouts
  for (let i = 0; i < users.length; i += CHUNK_SIZE) {
    const chunk = users.slice(i, i + CHUNK_SIZE);

    // GitHub rate limiting
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }

    const chunkResults = await Promise.allSettled(
      chunk.map(async (user) => {
        if (!user.githubUsername) throw new Error("missing github_username");
        const data = await fetchGitHubData(user.githubUsername);

        const scoreAll = calculateWaterlooScore({
          stars: data.stars,
          prs: data.mergedPRsAll,
          commits: data.commitsAll,
        });
        const score7d = calculateWaterlooScore({
          stars: data.stars,
          prs: data.prs7d,
          commits: data.commits7d,
        });
        const score30d = calculateWaterlooScore({
          stars: data.stars,
          prs: data.prs30d,
          commits: data.commits30d,
        });
        const score1y = calculateWaterlooScore({
          stars: data.stars,
          prs: data.prs1y,
          commits: data.commits1y,
        });

        const metricsData = {
          stars: data.stars,
          commits: data.commitsAll,
          mergedPrs: data.mergedPRsAll,
          rankScore: scoreAll,
          commits7d: data.commits7d,
          commits30d: data.commits30d,
          commits1y: data.commits1y,
          prs7d: data.prs7d,
          prs30d: data.prs30d,
          prs1y: data.prs1y,
          score7d,
          score30d,
          score1y,
          lastSynced: new Date(),
        };

        await prisma.githubMetrics.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...metricsData },
          update: metricsData,
        });

        return user.githubUsername;
      }),
    );

    for (let j = 0; j < chunkResults.length; j++) {
      const result = chunkResults[j];
      const username = chunk[j].githubUsername;
      if (result.status === "fulfilled") {
        results.push({ username, status: "ok" });
      } else {
        results.push({
          username,
          status: result.reason?.message ?? "unknown error",
        });
      }
    }
  }

  const synced = results.filter((r) => r.status === "ok").length;

  // Refresh the materialized view so the leaderboard reflects updated scores
  try {
    await refreshLeaderboard();
  } catch (err) {
    console.warn("Failed to refresh leaderboard materialized view:", err);
  }

  return NextResponse.json({ synced, total: users.length, results });
}
