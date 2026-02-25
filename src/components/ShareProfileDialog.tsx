"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Twitter, Linkedin, Link2, Check } from "lucide-react";
import type { LeaderboardEntry } from "@/app/leaderboard/leaderboard-table";
import type { TimeWindow } from "@/lib/leaderboard-shared";
import { getWindowScore, getWindowStats } from "@/lib/leaderboard-shared";

interface ShareProfileDialogProps {
    isOpen: boolean;
    onClose: () => void;
    entry: LeaderboardEntry;
    rank: number;
    timeWindow: TimeWindow;
}

function getDisplayName(entry: LeaderboardEntry): string {
    const fullName = `${entry.firstName ?? ""} ${entry.lastName ?? ""}`.trim();
    return fullName || entry.username;
}

export function ShareProfileDialog({
    isOpen,
    onClose,
    entry,
    rank,
    timeWindow,
}: ShareProfileDialogProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const displayName = getDisplayName(entry);
    const score = Math.round(getWindowScore(entry, timeWindow));
    const elo = Math.round(entry.elo_rating);
    const stats = getWindowStats(entry, timeWindow);
    const profileUrl = `https://uwgitrank.com/leaderboard?profile=${entry.username}`;

    const shareText = `I'm ranked #${rank} on UW GitRank! 🚀\n\nELO: ${elo} | Score: ${score.toLocaleString()}\nCheck out the leaderboard:`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`;
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(profileUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                    className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden mx-4 sm:mx-0"
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 transition-colors z-10 cursor-pointer"
                    >
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>

                    {/* Content */}
                    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900">
                                Share Profile
                            </h2>
                            <p className="text-sm text-zinc-500 mt-1">
                                Show off your GitHub stats!
                            </p>
                        </div>

                        {/* Visual Card Preview */}
                        <div className="bg-gradient-to-br from-[#EAB308] to-[#D9A307] rounded-xl p-4 sm:p-6 text-white shadow-lg">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <img
                                    src={`https://github.com/${entry.username}.png`}
                                    alt={displayName}
                                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-white/20"
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg sm:text-xl truncate">
                                        {displayName}
                                    </h3>
                                    <p className="text-white/90 text-sm">
                                        @{entry.username}
                                    </p>
                                    {entry.program && (
                                        <p className="text-white/80 text-xs mt-1">
                                            {entry.program}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4">
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                                    <div className="text-white/70 text-xs font-medium">
                                        Rank
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold mt-1">
                                        #{rank}
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                                    <div className="text-white/70 text-xs font-medium">
                                        ELO
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold mt-1">
                                        {elo}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                                <div className="text-white/70 text-xs font-medium mb-2">
                                    Score Breakdown
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-white/80">
                                            Stars:
                                        </span>
                                        <span className="font-semibold ml-1">
                                            {entry.stars}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-white/80">
                                            PRs:
                                        </span>
                                        <span className="font-semibold ml-1">
                                            {stats.prs}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-white/80">
                                            Commits:
                                        </span>
                                        <span className="font-semibold ml-1">
                                            {stats.commits}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-white/80">
                                            Endorsements:
                                        </span>
                                        <span className="font-semibold ml-1">
                                            {entry.endorsement_count}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 text-center">
                                <div className="text-xs text-white/60">
                                    uwgitrank.com
                                </div>
                            </div>
                        </div>

                        {/* Share Buttons */}
                        <div className="space-y-3">
                            <a
                                href={twitterUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 w-full p-3 rounded-lg border-2 border-zinc-200 hover:border-[#1DA1F2] hover:bg-[#1DA1F2]/5 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#1DA1F2] flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Twitter className="w-5 h-5 text-white fill-current" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="font-semibold text-zinc-900">
                                        Share on Twitter
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        Post to your timeline
                                    </div>
                                </div>
                            </a>

                            <a
                                href={linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 w-full p-3 rounded-lg border-2 border-zinc-200 hover:border-[#0A66C2] hover:bg-[#0A66C2]/5 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Linkedin className="w-5 h-5 text-white fill-current" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="font-semibold text-zinc-900">
                                        Share on LinkedIn
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        Share with your network
                                    </div>
                                </div>
                            </a>

                            <button
                                onClick={handleCopyLink}
                                className="flex items-center gap-3 w-full p-3 rounded-lg border-2 border-zinc-200 hover:border-[#EAB308] hover:bg-[#EAB308]/5 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    {copied ? (
                                        <Check className="w-5 h-5 text-white" />
                                    ) : (
                                        <Link2 className="w-5 h-5 text-white" />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="font-semibold text-zinc-900">
                                        {copied ? "Link Copied!" : "Copy Link"}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {copied
                                            ? "Ready to paste"
                                            : "Share anywhere"}
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
