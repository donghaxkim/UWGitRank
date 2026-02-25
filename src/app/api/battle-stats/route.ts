import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')

    if (!username) {
      return NextResponse.json({ error: 'username required' }, { status: 400 })
    }

    // Get user by username
    const user = await prisma.profile.findUnique({
      where: { username },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Fetch all matches where user was winner or loser
    const matches = await prisma.eloMatch.findMany({
      where: {
        OR: [{ winnerId: userId }, { loserId: userId }],
      },
      include: {
        winner: { select: { username: true, avatarUrl: true } },
        loser: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate stats
    let totalBattles = 0
    let wins = 0
    let losses = 0
    let totalEloGained = 0
    let totalEloLost = 0
    let maxEloGain = 0
    let maxEloLoss = 0

    for (const match of matches) {
      totalBattles++

      if (match.winnerId === userId) {
        wins++
        const eloDelta = match.winnerEloAfter - match.winnerEloBefore
        totalEloGained += eloDelta
        maxEloGain = Math.max(maxEloGain, eloDelta)
      } else {
        losses++
        const eloDelta = match.loserEloAfter - match.loserEloBefore
        totalEloLost += Math.abs(eloDelta)
        maxEloLoss = Math.max(maxEloLoss, Math.abs(eloDelta))
      }
    }

    return NextResponse.json({
      totalBattles,
      wins,
      losses,
      totalEloGained,
      totalEloLost,
      maxEloGain,
      maxEloLoss,
      matches: matches.slice(0, 100), // Limit to 100 most recent
      totalMatchCount: matches.length, // Total count before slicing
    })
  } catch (error) {
    console.error('[battle-stats] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch battle stats' },
      { status: 500 }
    )
  }
}
