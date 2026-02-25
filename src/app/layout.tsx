import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://uwgitrank.com";

const seoDescription =
  "Rank University of Waterloo students by open-source impact. Stars, merged PRs, commits & peer endorsements — see who's making waves on GitHub.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "UW GitRank — Waterloo Student GitHub Leaderboard",
    template: "%s | UW GitRank",
  },
  description: seoDescription,
  keywords: [
    "University of Waterloo",
    "GitHub",
    "leaderboard",
    "open source",
    "ranking",
    "students",
    "software engineering",
    "GitRank",
    "UWaterloo",
  ],
  authors: [{ name: "Dongha Kim" }, { name: "Brian An" }],
  creator: "UW GitRank",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "UW GitRank",
    title: "UW GitRank — Waterloo Student GitHub Leaderboard",
    description: seoDescription,
    images: [
      {
        url: `${siteUrl}/uwgitrank-og.jpg`,
        width: 1200,
        height: 630,
        alt: "UW GitRank Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UW GitRank — Waterloo Student GitHub Leaderboard",
    description: seoDescription,
    images: [`${siteUrl}/GitHub_Invertocat_Black.svg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1 },
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
