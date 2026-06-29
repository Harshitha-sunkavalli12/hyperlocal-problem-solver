import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import type { LeaderboardEntry } from "../lib/types";

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    api.leaderboard().then(setEntries).catch(() => {});
  }, []);

  const hero = entries[0];
  const rest = entries.slice(1);
  const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen px-4 pb-24 pt-6"
    >
      <h1 className="text-xl font-black text-white">Leaderboard</h1>
      <p className="text-xs text-gray-400">Top civic heroes by XP</p>

      {hero && (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="mt-4 rounded-2xl bg-gradient-to-br from-amber/30 to-teal/10 p-5 text-center shadow-glowamber"
        >
          <div className="text-xs font-semibold uppercase tracking-widest text-amber">
            🏆 Community Hero of the Month
          </div>
          <div className="mt-2 text-3xl">👑</div>
          <div className="text-xl font-black text-white">@{hero.handle}</div>
          <div className="text-sm text-gray-200">{hero.xp} XP · {hero.locality}</div>
          {hero.badges?.length > 0 && (
            <div className="mt-1 text-xs text-gray-300">{hero.badges.join(" · ")}</div>
          )}
        </motion.div>
      )}

      <div className="mt-4 space-y-2">
        {rest.map((e) => (
          <div key={e.handle} className="glass flex items-center gap-3 rounded-xl p-3">
            <span className="w-8 text-center text-sm font-bold text-gray-300">{medal(e.rank)}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal/20 text-sm font-bold text-teal">
              {e.handle.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">@{e.handle}</div>
              <div className="text-[10px] text-gray-400">{e.locality}</div>
            </div>
            <span className="text-sm font-bold text-teal">{e.xp} XP</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
