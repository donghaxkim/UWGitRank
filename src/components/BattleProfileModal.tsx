"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Swords, Trophy, Share2 } from "lucide-react";
import type { LeaderboardEntry } from "@/app/leaderboard/leaderboard-table";
import { ShareProfileDialog } from "@/components/ShareProfileDialog";

interface EloMatchRecord {
    id: string;
    winnerId: string;
    loserId: string;
    voterId: string;
    winnerEloBefore: number;
    loserEloBefore: number;
    winnerEloAfter: number;
    loserEloAfter: number;
    createdAt: string;
    winner?: { username: string; avatarUrl: string | null };
    loser?: { username: string; avatarUrl: string | null };
}

interface BattleStats {
    totalBattles: number;
    wins: number;
    losses: number;
    totalEloGained: number;
    totalEloLost: number;
    maxEloGain: number;
    maxEloLoss: number;
    matches: EloMatchRecord[];
    totalMatchCount: number;
    hasMore?: boolean;
}

interface TimelineMatch {
    id: string;
    winnerId: string;
    loserId: string;
    winnerEloAfter: number;
    loserEloAfter: number;
    createdAt: string;
}

interface BattleProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: LeaderboardEntry;
}

export function BattleProfileModal({
    isOpen,
    onClose,
    entry,
}: BattleProfileModalProps) {
    const [stats, setStats] = useState<BattleStats | null>(null);
    const [timelineMatches, setTimelineMatches] = useState<TimelineMatch[]>([]);
    const [userId, setUserId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [activeTab, setActiveTab] = useState<"stats" | "timeline" | "log">(
        "stats",
    );
    const [showShareDialog, setShowShareDialog] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        // Fetch battle stats and battle log
        Promise.all([
            fetch(`/api/battle-stats?username=${entry.username}&limit=50`).then(
                (res) => res.json(),
            ),
            fetch(
                `/api/battle-stats?username=${entry.username}&timelineOnly=true&maxPoints=100`,
            ).then((res) => res.json()),
        ])
            .then(([statsData, timelineData]) => {
                setStats(statsData);
                setTimelineMatches(timelineData.matches || []);
                setUserId(timelineData.userId || "");
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch battle stats:", err);
                setLoading(false);
            });
    }, [isOpen, entry.username]);

    const loadMoreMatches = async () => {
        if (!stats || loadingMore) return;

        setLoadingMore(true);
        try {
            const res = await fetch(
                `/api/battle-stats?username=${entry.username}&limit=50&offset=${stats.matches.length}`,
            );
            const data = await res.json();

            setStats((prev) =>
                prev
                    ? {
                          ...prev,
                          matches: [...prev.matches, ...data.matches],
                          hasMore: data.hasMore,
                      }
                    : null,
            );
        } catch (err) {
            console.error("Failed to load more matches:", err);
        } finally {
            setLoadingMore(false);
        }
    };

    if (!isOpen) return null;

    const displayName =
        `${entry.firstName ?? ""} ${entry.lastName ?? ""}`.trim() ||
        entry.username;
    const winRate =
        stats && stats.totalBattles > 0
            ? ((stats.wins / stats.totalBattles) * 100).toFixed(1)
            : 0;

    return (
        <AnimatePresence>
            <div
                key="battle-profile-modal"
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", duration: 0.3 }}
                    className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#EAB308] to-[#D9A307] p-6 text-white relative">
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button
                                onClick={() => setShowShareDialog(true)}
                                className="p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                                aria-label="Share profile"
                                title="Share Profile"
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <a
                                href={`https://github.com/${entry.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-start gap-3 group cursor-pointer"
                            >
                                <img
                                    src={`https://github.com/${entry.username}.png`}
                                    alt={displayName}
                                    className="w-16 h-16 rounded-full border-4 border-white/20"
                                />
                                <div>
                                    <h2 className="text-2xl font-bold group-hover:underline">
                                        {displayName}
                                    </h2>
                                    <p className="text-white/90">
                                        @{entry.username}
                                    </p>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-zinc-200 bg-zinc-50">
                        {(["stats", "timeline", "log"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-3 px-4 font-medium transition-colors text-sm ${
                                    activeTab === tab
                                        ? "text-[#EAB308] border-b-2 border-[#EAB308] bg-white"
                                        : "text-zinc-600 hover:text-zinc-900"
                                }`}
                            >
                                {tab === "stats" && "Battle Stats"}
                                {tab === "timeline" && "ELO Timeline"}
                                {tab === "log" && "Battle Log"}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-zinc-400">
                                    Loading battle data...
                                </div>
                            </div>
                        ) : !stats ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-zinc-400">
                                    No battle data available
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Stats Tab */}
                                {activeTab === "stats" && (
                                    <div className="space-y-6">
                                        <div className="grid grid-rows-3 sm:grid-cols-3 sm:grid-rows-1 gap-4">
                                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                                                <div className="text-sm text-blue-600 font-medium">
                                                    Total Battles
                                                </div>
                                                <div className="text-3xl font-bold text-blue-900 mt-2">
                                                    {stats.totalBattles}
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                                                <div className="text-sm text-green-600 font-medium">
                                                    Win Rate
                                                </div>
                                                <div className="text-3xl font-bold text-green-900 mt-2">
                                                    {winRate}%
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                                                <div className="text-sm text-purple-600 font-medium">
                                                    Record
                                                </div>
                                                <div className="text-2xl font-bold text-purple-900 mt-2">
                                                    {stats.wins}W/
                                                    {stats.losses}L
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="border border-zinc-200 rounded-lg p-4">
                                                <div className="text-sm text-zinc-600 font-medium mb-3">
                                                    ELO Gains
                                                </div>
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-xs text-zinc-500">
                                                            Total
                                                        </span>
                                                        <div className="text-2xl font-bold text-green-600">
                                                            +
                                                            {stats.totalEloGained.toFixed(
                                                                0,
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-zinc-500">
                                                            Max Single Gain
                                                        </span>
                                                        <div className="text-lg font-bold text-green-600">
                                                            +
                                                            {stats.maxEloGain.toFixed(
                                                                0,
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border border-zinc-200 rounded-lg p-4">
                                                <div className="text-sm text-zinc-600 font-medium mb-3">
                                                    ELO Losses
                                                </div>
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-xs text-zinc-500">
                                                            Total
                                                        </span>
                                                        <div className="text-2xl font-bold text-red-600">
                                                            -
                                                            {stats.totalEloLost.toFixed(
                                                                0,
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-zinc-500">
                                                            Max Single Loss
                                                        </span>
                                                        <div className="text-lg font-bold text-red-600">
                                                            -
                                                            {stats.maxEloLoss.toFixed(
                                                                0,
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Timeline Tab */}
                                {activeTab === "timeline" && (
                                    <div className="space-y-4">
                                        <div className="text-sm text-zinc-600 mb-4">
                                            ELO progression over time (
                                            {timelineMatches.length} battles
                                            sampled)
                                        </div>
                                        <SimpleEloTimeline
                                            matches={timelineMatches}
                                            userId={userId}
                                        />
                                    </div>
                                )}

                                {/* Battle Log Tab */}
                                {activeTab === "log" && (
                                    <div className="space-y-3">
                                        {stats.matches.length === 0 ? (
                                            <div className="text-center py-8 text-zinc-400">
                                                No battles yet
                                            </div>
                                        ) : (
                                            <>
                                                {stats.matches.map((match) => (
                                                    <BattleLogEntry
                                                        key={match.id}
                                                        match={match}
                                                        username={
                                                            entry.username
                                                        }
                                                    />
                                                ))}
                                                {stats.hasMore && (
                                                    <button
                                                        onClick={
                                                            loadMoreMatches
                                                        }
                                                        disabled={loadingMore}
                                                        className="w-full py-3 text-sm font-medium text-[#EAB308] bg-[#EAB308]/5 hover:bg-[#EAB308]/10 rounded-lg border border-[#EAB308]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {loadingMore
                                                            ? "Loading..."
                                                            : `Load More (${stats.totalMatchCount - stats.matches.length} remaining)`}
                                                    </button>
                                                )}
                                                {!stats.hasMore &&
                                                    stats.totalMatchCount >
                                                        stats.matches
                                                            .length && (
                                                        <div className="text-center py-4 text-sm text-zinc-500 bg-zinc-50 rounded-lg border border-zinc-200">
                                                            All battles loaded
                                                        </div>
                                                    )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Share Dialog */}
            <ShareProfileDialog
                isOpen={showShareDialog}
                onClose={() => setShowShareDialog(false)}
                entry={entry}
                rank={(entry as any).rank || 0}
                timeWindow="all"
                urlParam="battleProfile"
            />
        </AnimatePresence>
    );
}

function SimpleEloTimeline({
    matches,
    userId,
}: {
    matches: TimelineMatch[];
    userId: string;
}) {
    if (matches.length === 0) {
        return (
            <div className="text-center py-8 text-zinc-400">
                No battle history
            </div>
        );
    }

    // Calculate ELO progression (reverse order for chronological)
    const reversedMatches = [...matches].reverse();

    const points = reversedMatches.map((match) => {
        const isWin = match.winnerId === userId;
        const elo = isWin ? match.winnerEloAfter : match.loserEloAfter;
        return {
            elo,
            isWin,
            date: new Date(match.createdAt),
        };
    });

    const minElo = Math.min(...points.map((p) => p.elo));
    const maxElo = Math.max(...points.map((p) => p.elo));
    const padding = Math.max((maxElo - minElo) * 0.1, 50);
    const chartMinElo = minElo - padding;
    const chartMaxElo = maxElo + padding;
    const eloRange = chartMaxElo - chartMinElo;

    // Chart dimensions
    const width = 600;
    const height = 300;
    const marginTop = 20;
    const marginBottom = 40;
    const marginLeft = 50;
    const marginRight = 20;
    const chartWidth = width - marginLeft - marginRight;
    const chartHeight = height - marginTop - marginBottom;

    // Scale functions
    const xScale = (index: number) =>
        marginLeft + (index / (points.length - 1 || 1)) * chartWidth;
    const yScale = (elo: number) =>
        marginTop +
        chartHeight -
        ((elo - chartMinElo) / eloRange) * chartHeight;

    // Generate path for the line
    const linePath = points
        .map((point, idx) => {
            const x = xScale(idx);
            const y = yScale(point.elo);
            return idx === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
        })
        .join(" ");

    // Generate Y-axis ticks
    const yTicks = 5;
    const yTickValues = Array.from({ length: yTicks }, (_, i) => {
        return chartMinElo + (eloRange / (yTicks - 1)) * i;
    });

    return (
        <div className="space-y-3">
            <div className="bg-zinc-50 rounded-lg p-2 overflow-x-auto">
                <svg
                    width={width}
                    height={height}
                    className="mx-auto"
                    viewBox={`0 0 ${width} ${height}`}
                >
                    {/* Y-axis grid lines */}
                    {yTickValues.map((value, idx) => {
                        const y = yScale(value);
                        return (
                            <g key={`yaxis-${idx}`}>
                                <line
                                    x1={marginLeft}
                                    y1={y}
                                    x2={width - marginRight}
                                    y2={y}
                                    stroke="#e5e7eb"
                                    strokeWidth="1"
                                />
                                <text
                                    x={marginLeft - 10}
                                    y={y + 4}
                                    textAnchor="end"
                                    fontSize="12"
                                    fill="#71717a"
                                >
                                    {value.toFixed(0)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Line path with gradient */}
                    <defs>
                        <linearGradient
                            id="lineGradient"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="0%"
                        >
                            <stop offset="0%" stopColor="#EAB308" />
                            <stop offset="100%" stopColor="#D9A307" />
                        </linearGradient>
                    </defs>

                    <motion.path
                        d={linePath}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                    />

                    {/* Data points */}
                    {points.map((point, idx) => {
                        const x = xScale(idx);
                        const y = yScale(point.elo);
                        return (
                            <motion.g
                                key={`point-${idx}`}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 + idx * 0.02 }}
                            >
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="5"
                                    fill={point.isWin ? "#22c55e" : "#ef4444"}
                                    stroke="white"
                                    strokeWidth="2"
                                />
                            </motion.g>
                        );
                    })}

                    {/* X-axis label */}
                    <text
                        x={width / 2}
                        y={height - 5}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#71717a"
                    >
                        Battle Timeline
                    </text>
                </svg>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>
                    {points.length} battles • Range: {minElo.toFixed(0)} -{" "}
                    {maxElo.toFixed(0)}
                </span>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        Win
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        Loss
                    </span>
                </div>
            </div>
        </div>
    );
}

function BattleLogEntry({
    match,
    username,
}: {
    match: EloMatchRecord;
    username: string;
}) {
    const isWin = match.winner?.username === username;
    const opponent = isWin ? match.loser : match.winner;
    const eloBefore = isWin ? match.winnerEloBefore : match.loserEloBefore;
    const eloAfter = isWin ? match.winnerEloAfter : match.loserEloAfter;
    const eloDelta = eloAfter - eloBefore;

    return (
        <div
            className={`border-2 rounded-lg p-4 transition-colors ${
                isWin
                    ? "border-green-200 bg-green-50/50"
                    : "border-red-200 bg-red-50/50"
            }`}
        >
            <div className="flex flex-col gap-1 items-center sm:flex-row sm:gap-0">
                <div className="flex items-center gap-3 flex-1">
                    <div
                        className={`px-3 py-1 rounded-full text-sm font-bold ${
                            isWin
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                        }`}
                    >
                        {isWin ? "Won" : "Lost"}
                    </div>

                    {opponent && (
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm text-zinc-500">vs</span>
                            <a
                                href={`https://github.com/${opponent.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 group cursor-pointer"
                            >
                                <img
                                    src={`https://github.com/${opponent.username}.png`}
                                    alt={opponent.username}
                                    className="w-6 h-6 rounded-full"
                                />
                                <span className="text-sm font-medium truncate group-hover:underline">
                                    @{opponent.username}
                                </span>
                            </a>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 text-right">
                    <div className="text-sm">
                        <span className="text-zinc-600">
                            {eloBefore.toFixed(0)}
                        </span>
                        <span className="text-zinc-400 mx-2">→</span>
                        <span className="font-bold">{eloAfter.toFixed(0)}</span>
                    </div>
                    <div
                        className={`font-bold text-sm min-w-[60px] ${
                            eloDelta > 0 ? "text-green-600" : "text-red-600"
                        }`}
                    >
                        {eloDelta > 0 ? "+" : ""}
                        {eloDelta.toFixed(1)}
                    </div>
                </div>
            </div>

            <div className="w-full text-center text-xs text-zinc-500 mt-2">
                {new Date(match.createdAt).toLocaleString()}
            </div>
        </div>
    );
}
