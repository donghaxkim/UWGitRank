"use client";

import { motion } from "framer-motion";
import { Heart, Share2 } from "lucide-react";
import { Tooltip } from "radix-ui";
import type { RankedEntry, TimeWindow } from "@/lib/leaderboard-shared";
import { getWindowStats } from "@/lib/leaderboard-shared";
import { LeaderboardTooltipContent } from "@/components/LeaderboardTooltipContent";

const PLACE_STYLES: Record<number, { card: string; height: string }> = {
    1: { card: "card-holographic", height: "h-28" },
    2: { card: "card-silver", height: "h-20" },
    3: { card: "card-bronze", height: "h-14" },
};

const PLACE_DELAYS: Record<number, number> = { 2: 0, 1: 0.15, 3: 0.3 };

function PodiumCard({
    entry,
    place,
    timeWindow,
    isEndorsed,
    canEndorse,
    onEndorse,
    onShare,
    isCurrentUser,
}: {
    entry: RankedEntry;
    place: number;
    timeWindow: TimeWindow;
    isEndorsed: boolean;
    canEndorse: boolean;
    onEndorse: () => void;
    onShare: () => void;
    isCurrentUser: boolean;
}) {
    const style = PLACE_STYLES[place];
    const stats = getWindowStats(entry, timeWindow);
    const delay = PLACE_DELAYS[place] ?? 0;

    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <motion.div
                    className="flex flex-col items-center gap-2 min-w-0 cursor-pointer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay, ease: "easeOut" }}
                >
                    {/* Avatar with colored ring */}
                    <a
                        href={`https://github.com/${entry.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <motion.div
                            className={`rounded-full p-[3px] ${style.card}`}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                delay: delay + 0.15,
                                type: "spring",
                                stiffness: 200,
                                damping: 18,
                            }}
                        >
                            <img
                                src={`https://github.com/${entry.username}.png`}
                                alt={entry.username}
                                width={place === 1 ? 72 : 56}
                                height={place === 1 ? 72 : 56}
                                className={`rounded-full border-2 border-white bg-white ${place === 1 ? "w-14 h-14 sm:w-[72px] sm:h-[72px]" : "w-11 h-11 sm:w-14 sm:h-14"}`}
                            />
                        </motion.div>

                        {/* Name & score */}
                        <div className="text-center min-w-0 max-w-[90px] sm:max-w-[120px]">
                            <div className="font-bold text-xs sm:text-sm truncate hover:underline">
                                {`${entry.firstName ?? ""} ${entry.lastName ?? ""}`.trim() ||
                                    entry.username}
                                {isCurrentUser && (
                                    <span className="text-primary font-semibold">
                                        {" "}
                                        (you)
                                    </span>
                                )}
                            </div>
                            <div className="text-xs font-mono font-semibold mt-0.5 tabular-nums">
                                {stats.score.toLocaleString()} pts
                            </div>
                        </div>
                    </a>
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (canEndorse) onEndorse();
                            }}
                            disabled={!canEndorse}
                            className={`mt-1 inline-flex items-center justify-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                                canEndorse
                                    ? isEndorsed
                                        ? "bg-pink-50 text-pink-600 border border-pink-200 hover:bg-pink-100 cursor-pointer"
                                        : "bg-white/80 text-zinc-500 border border-zinc-200 hover:bg-pink-50 hover:text-pink-500 cursor-pointer"
                                    : "text-zinc-400 border border-zinc-100 bg-white/50 cursor-default"
                            }`}
                            aria-label={
                                isEndorsed ? "Remove endorsement" : "Endorse"
                            }
                        >
                            <Heart
                                className={`h-2.5 w-2.5 transition-colors ${
                                    isEndorsed
                                        ? "fill-pink-500 text-pink-500"
                                        : ""
                                }`}
                            />
                            <span className="tabular-nums">
                                {Number(entry.endorsement_count) || 0}
                            </span>
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onShare();
                            }}
                            className="mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/80 border border-zinc-200 hover:border-[#EAB308] hover:bg-[#EAB308]/10 transition-all cursor-pointer group"
                            aria-label="Share profile"
                        >
                            <Share2 className="h-2 w-2 text-zinc-500 group-hover:text-[#EAB308] transition-colors" />
                        </button>
                    </div>

                    {/* Pedestal */}
                    <motion.div
                        className={`w-20 sm:w-28 ${style.height} rounded-t-xl flex items-center justify-center ${style.card} origin-bottom`}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{
                            delay: delay + 0.1,
                            type: "spring",
                            stiffness: 160,
                            damping: 20,
                        }}
                    >
                        <span
                            className={`text-2xl font-black ${place === 1 ? "text-white" : "text-white/80"}`}
                        >
                            {place}
                        </span>
                    </motion.div>
                </motion.div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content
                    className="rounded-lg bg-zinc-900 text-white px-3 py-2.5 text-xs shadow-lg z-50 max-w-[200px]"
                    sideOffset={8}
                    side="top"
                >
                    <LeaderboardTooltipContent
                        entry={entry}
                        timeWindow={timeWindow}
                    />
                    <Tooltip.Arrow className="fill-zinc-900" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}

export function Podium({
    entries,
    timeWindow,
    endorsedSet,
    currentUserUsername,
    isVerified,
    onEndorse,
    onShare,
}: {
    entries: RankedEntry[];
    timeWindow: TimeWindow;
    endorsedSet: Set<string>;
    currentUserUsername?: string;
    isVerified: boolean;
    onEndorse: (username: string) => void;
    onShare: (entry: RankedEntry, rank: number) => void;
}) {
    if (entries.length === 0) return null;

    const first = entries[0];
    const second = entries.length > 1 ? entries[1] : null;
    const third = entries.length > 2 ? entries[2] : null;

    function cardProps(entry: RankedEntry) {
        const isCurrentUser = currentUserUsername === entry.username;
        return {
            isEndorsed: endorsedSet.has(entry.username),
            canEndorse: isVerified && !isCurrentUser && !!currentUserUsername,
            onEndorse: () => onEndorse(entry.username),
            isCurrentUser,
        };
    }

    return (
        <div className="flex items-end justify-center gap-2 sm:gap-6 pt-4 pb-2">
            {/* 2nd place — left */}
            {second ? (
                <PodiumCard
                    entry={second}
                    place={2}
                    timeWindow={timeWindow}
                    {...cardProps(second)}
                    onShare={() => onShare(second, 2)}
                />
            ) : (
                <div className="w-20 sm:w-28" />
            )}

            {/* 1st place — center */}
            <PodiumCard
                entry={first}
                place={1}
                timeWindow={timeWindow}
                {...cardProps(first)}
                onShare={() => onShare(first, 1)}
            />

            {/* 3rd place — right */}
            {third ? (
                <PodiumCard
                    entry={third}
                    place={3}
                    timeWindow={timeWindow}
                    {...cardProps(third)}
                    onShare={() => onShare(third, 3)}
                />
            ) : (
                <div className="w-20 sm:w-28" />
            )}
        </div>
    );
}
