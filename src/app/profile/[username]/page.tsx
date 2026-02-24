import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Trophy, Github, Star, GitCommit, GitPullRequest, Heart, Swords, Link as LinkIcon, BadgeCheck, ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScaleIn, FadeIn, StaggerContainer, StaggerItem } from '@/components/motion'
import Link from 'next/link'
import { ENDORSEMENT_WEIGHT, ELO_WEIGHT, ELO_BASELINE } from '@/utils/ranking'

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
    const { username } = await params
    return {
        title: `${username}'s Profile`,
        description: `View ${username}'s open-source stats and GitHub ranking on UW GitRank.`,
        alternates: { canonical: `/profile/${username}` },
        openGraph: {
            title: `${username} — UW GitRank`,
            description: `See ${username}'s GitHub contributions and Waterloo ranking.`,
        },
    }
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
    const { username } = await params

    const profile = await prisma.profile.findFirst({
        where: { username },
        include: { githubMetrics: true },
    })

    if (!profile) notFound()

    const metrics = profile.githubMetrics
    const fullName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || username
    const endorsements = metrics?.endorsementCount ?? 0
    const stars = metrics?.stars ?? 0
    const commits = metrics?.commits ?? 0
    const mergedPrs = metrics?.mergedPrs ?? 0
    const eloRating = metrics?.eloRating ?? ELO_BASELINE
    const eloBonus = Math.round((eloRating - ELO_BASELINE) * ELO_WEIGHT)
    const rankScore = (metrics?.rankScore ?? 0) + endorsements * ENDORSEMENT_WEIGHT + eloBonus

    return (
        <div className="min-h-screen bg-[#f2f2f2] text-zinc-900">
            <header className="border-b border-zinc-200 bg-white/60 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center">
                    <Link href="/leaderboard" className="font-bold text-lg tracking-tight flex items-center gap-2 text-zinc-900 hover:text-zinc-600 transition-colors">
                        <Trophy className="w-5 h-5 text-[#EAB308]" />
                        <span>GitRank</span>
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                    <ScaleIn>
                        <img
                            src={`https://github.com/${username}.png`}
                            alt={username}
                            className="w-32 h-32 md:w-44 md:h-44 rounded-full border-4 border-white shadow-xl"
                        />
                    </ScaleIn>

                    <FadeIn delay={0.1} className="flex-1 space-y-4 text-center md:text-left">
                        <div className="space-y-1">
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <h1 className="text-3xl font-extrabold tracking-tight">{fullName}</h1>
                                {profile.isVerified ? (
                                    <BadgeCheck className="w-6 h-6 text-[#EAB308]" />
                                ) : (
                                    <ShieldX className="w-6 h-6 text-zinc-400" />
                                )}
                            </div>
                            <p className="text-lg text-zinc-500">@{username}</p>
                        </div>

                        {profile.program && (
                            <p className="text-zinc-600">{profile.program}</p>
                        )}

                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <Button asChild variant="outline" size="sm">
                                <a href={`https://github.com/${username}`} target="_blank" rel="noreferrer" className="gap-2">
                                    <Github className="w-4 h-4" />
                                    GitHub Profile
                                    <LinkIcon className="w-3 h-3 opacity-50" />
                                </a>
                            </Button>
                            {profile.linkedinUrl && (
                                <Button asChild variant="outline" size="sm">
                                    <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="gap-2">
                                        LinkedIn
                                        <LinkIcon className="w-3 h-3 opacity-50" />
                                    </a>
                                </Button>
                            )}
                        </div>
                    </FadeIn>
                </div>

                {/* Rank Score */}
                <FadeIn delay={0.15}>
                    <div className="bg-zinc-900 text-white rounded-2xl p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-400 font-medium">Rank Score</p>
                            <p className="text-4xl font-extrabold tabular-nums text-[#EAB308]">
                                {Math.round(rankScore).toLocaleString()}
                            </p>
                        </div>
                        {metrics?.lastSynced && (
                            <p className="text-xs text-zinc-500">
                                Last synced {new Date(metrics.lastSynced).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </FadeIn>

                {/* Stats Grid */}
                <StaggerContainer stagger={0.1} delay={0.2} className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StaggerItem>
                        <Card className="border-zinc-200 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                                    <Star className="w-3.5 h-3.5 text-yellow-600" />
                                    Stars
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold">{stars.toLocaleString()}</span>
                            </CardContent>
                        </Card>
                    </StaggerItem>

                    <StaggerItem>
                        <Card className="border-zinc-200 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                                    <GitPullRequest className="w-3.5 h-3.5 text-blue-600" />
                                    Merged PRs
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold">{mergedPrs.toLocaleString()}</span>
                            </CardContent>
                        </Card>
                    </StaggerItem>

                    <StaggerItem>
                        <Card className="border-zinc-200 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                                    <GitCommit className="w-3.5 h-3.5 text-green-600" />
                                    Commits
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold">{commits.toLocaleString()}</span>
                            </CardContent>
                        </Card>
                    </StaggerItem>

                    <StaggerItem>
                        <Card className="border-zinc-200 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                                    <Heart className="w-3.5 h-3.5 text-pink-600" />
                                    Endorsements
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold">{endorsements.toLocaleString()}</span>
                            </CardContent>
                        </Card>
                    </StaggerItem>

                    <StaggerItem>
                        <Card className="border-zinc-200 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                                    <Swords className="w-3.5 h-3.5 text-orange-600" />
                                    ELO Rating
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold">{Math.round(eloRating).toLocaleString()}</span>
                            </CardContent>
                        </Card>
                    </StaggerItem>
                </StaggerContainer>
            </main>
        </div>
    )
}
