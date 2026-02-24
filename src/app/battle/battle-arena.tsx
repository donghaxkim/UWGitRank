"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitEloVote, type MatchupUser } from "@/app/auth/actions";
import type { TopRepo } from "@/lib/github-repos";
import { Button } from "@/components/ui/button";
import { Star, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface BattleUser extends MatchupUser {
  repos: TopRepo[];
}

interface BattleArenaProps {
  userA: BattleUser;
  userB: BattleUser;
}

interface VoteResult {
  winnerId: string;
  loserId: string;
  winnerEloBefore: number;
  loserEloBefore: number;
  winnerEloAfter: number;
  loserEloAfter: number;
}

function UserCard({
  user,
  onVote,
  disabled,
  result,
  side,
}: {
  user: BattleUser;
  onVote: () => void;
  disabled: boolean;
  result: VoteResult | null;
  side: "left" | "right";
}) {
  const isWinner = result?.winnerId === user.id;
  const isLoser = result?.loserId === user.id;
  const eloDelta = result
    ? isWinner
      ? result.winnerEloAfter - result.winnerEloBefore
      : result.loserEloAfter - result.loserEloBefore
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: side === "left" ? 0.1 : 0.2 }}
      className="flex-1 min-w-0"
    >
      <button
        type="button"
        onClick={onVote}
        disabled={disabled}
        className={`cursor-pointer w-full text-left rounded-xl border-2 p-6 transition-all ${
          result
            ? isWinner
              ? "border-[#EAB308] bg-[#EAB308]/5"
              : "border-zinc-200 bg-zinc-50/50 opacity-70"
            : "border-zinc-200 bg-white hover:border-[#EAB308] hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
        } ${disabled && !result ? "pointer-events-none" : ""}`}
      >
        {/* User header */}
        <div className="flex items-center gap-3 mb-4">
          {user.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-12 h-12 rounded-full border-2 border-zinc-200"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-zinc-900 truncate">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.username}
            </div>
            <div className="text-sm text-zinc-500 truncate">@{user.username}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-zinc-400 uppercase tracking-wide">ELO</div>
            <div className="font-bold text-lg text-zinc-900">
              {Math.round(user.eloRating)}
            </div>
          </div>
        </div>

        {/* ELO change animation */}
        <AnimatePresence>
          {result && eloDelta !== 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center justify-center gap-1 mb-3 text-sm font-bold ${
                eloDelta > 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              {eloDelta > 0 ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
              {eloDelta > 0 ? "+" : ""}
              {eloDelta} ELO
            </motion.div>
          )}
        </AnimatePresence>

        {/* Program badge */}
        {user.program && (
          <div className="mb-4">
            <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-zinc-100 text-zinc-600 font-medium">
              {user.program}
            </span>
          </div>
        )}

        {/* Repos list */}
        <div className="space-y-2.5">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Top Repos
          </div>
          {user.repos.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No public repos</p>
          ) : (
            user.repos.map((repo) => (
              <div
                key={repo.name}
                className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-zinc-900 truncate">
                      {repo.name}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
                    <Star className="w-3 h-3 text-[#EAB308]" />
                    {repo.stargazerCount}
                  </div>
                </div>
                {repo.primaryLanguage && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: repo.primaryLanguage.color }}
                    />
                    <span className="text-xs text-zinc-500">
                      {repo.primaryLanguage.name}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Vote prompt */}
        {!result && (
          <div className="mt-4 text-center">
            <span className="text-xs font-medium text-[#EAB308] uppercase tracking-wide">
              Click to vote
            </span>
          </div>
        )}

        {result && isWinner && (
          <div className="mt-4 text-center">
            <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-[#EAB308] text-black uppercase tracking-wide">
              Winner
            </span>
          </div>
        )}
      </button>
    </motion.div>
  );
}

export function BattleArena({ userA, userB }: BattleArenaProps) {
  const [result, setResult] = useState<VoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleVote(winnerId: string, loserId: string) {
    if (result || isPending) return;
    setError(null);

    startTransition(async () => {
      const res = await submitEloVote(winnerId, loserId);
      if ("error" in res) {
        setError(res.error ?? "An error occurred");
        return;
      }
      setResult(res);
    });
  }

  function handleNextBattle() {
    router.refresh();
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch">
        <UserCard
          user={userA}
          onVote={() => handleVote(userA.id, userB.id)}
          disabled={isPending || result !== null}
          result={result}
          side="left"
        />

        {/* VS divider */}
        <div className="flex items-center justify-center md:flex-col">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
            className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-[#EAB308] font-extrabold text-sm shadow-lg"
          >
            VS
          </motion.div>
        </div>

        <UserCard
          user={userB}
          onVote={() => handleVote(userB.id, userA.id)}
          disabled={isPending || result !== null}
          result={result}
          side="right"
        />
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2"
        >
          {error}
        </motion.div>
      )}

      {isPending && (
        <div className="text-center text-sm text-zinc-400">Submitting vote...</div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <Button
            onClick={handleNextBattle}
            size="lg"
            className="cursor-pointer bg-[#EAB308] text-black hover:bg-[#D9A307] font-semibold flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Next Battle
          </Button>
        </motion.div>
      )}
    </div>
  );
}
