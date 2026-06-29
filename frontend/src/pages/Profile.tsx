import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import IssueCard from "../components/IssueCard";
import { api, ME } from "../lib/api";
import { clearSession, getSession } from "../lib/auth";
import type { Issue } from "../lib/types";

const ALL_BADGES = [
  { name: "Pothole Hunter", icon: "🕳️" },
  { name: "Water Guardian", icon: "💧" },
  { name: "Street Light Hero", icon: "💡" },
  { name: "Clean Streets Champion", icon: "🗑️" },
  { name: "Infrastructure Defender", icon: "🏗️" },
];

export default function Profile() {
  const nav = useNavigate();
  const handle = ME();
  const [user, setUser] = useState<any>(null);
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    api.user(handle).then(setUser).catch(() => {});
    api.userIssues(handle).then(setIssues).catch(() => {});
  }, [handle]);

  const xp = user?.xp ?? 0;
  const level = Math.floor(xp / 100) + 1;
  const progress = xp % 100;
  const earned = new Set<string>(user?.badges || []);
  const isGuest = !getSession();

  function logout() {
    clearSession();
    nav("/login");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen px-4 pb-24 pt-6"
    >
      <h1 className="text-xl font-black text-white">My Profile</h1>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-teal/20 to-amber/10 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal text-2xl font-black text-midnight">
            {handle.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-bold text-white">@{handle}</div>
            <div className="text-xs text-gray-300">Level {level} Civic Hero · {xp} XP</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px] text-gray-300">
            <span>Level {level}</span>
            <span>{progress}/100 to next</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/30">
            <div className="h-full rounded-full bg-teal" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold text-white">Badges</h2>
      <div className="grid grid-cols-5 gap-2">
        {ALL_BADGES.map((b) => {
          const has = earned.has(b.name);
          return (
            <div
              key={b.name}
              className={`flex flex-col items-center rounded-xl p-2 text-center ${
                has ? "glass" : "opacity-30"
              }`}
              title={b.name}
            >
              <span className="text-2xl" style={{ filter: has ? "none" : "grayscale(1)" }}>
                {b.icon}
              </span>
              <span className="mt-1 text-[8px] leading-tight text-gray-400">{b.name}</span>
            </div>
          );
        })}
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold text-white">My Reports ({issues.length})</h2>
      <div className="space-y-2.5">
        {issues.map((i) => (
          <IssueCard key={i.id} issue={i} />
        ))}
        {!issues.length && <p className="text-sm text-gray-500">No reports yet. Tap ➕ to start.</p>}
      </div>

      <button
        onClick={logout}
        className="mt-6 w-full rounded-2xl border border-white/10 py-3 text-sm font-semibold text-gray-300"
      >
        {isGuest ? "Sign in / create account" : "Log out"}
      </button>
    </motion.div>
  );
}
