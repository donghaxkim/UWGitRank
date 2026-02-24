import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://uwgitrank.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/verify`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  let profileRoutes: MetadataRoute.Sitemap = [];
  try {
    const profiles = await prisma.profile.findMany({
      where: { isVerified: true },
      select: { username: true },
    });
    profileRoutes = profiles.map((p) => ({
      url: `${siteUrl}/profile/${p.username}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable at build time — skip profile routes
  }

  return [...staticRoutes, ...profileRoutes];
}
