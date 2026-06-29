import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Globe3D from "../components/Globe3D";
import IssueCard from "../components/IssueCard";
import { api } from "../lib/api";
import { useWebSocket } from "../lib/useWebSocket";
import type { Issue } from "../lib/types";

const FILTERS = ["all", "pothole", "water_leak", "streetlight", "garbage", "infrastructure"];

export default function Home() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState("all");
  const { connected, last } = useWebSocket();

  const load = () => api.listIssues().then(setIssues).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  // Live refresh on any backend event.
  useEffect(() => {
    if (last) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last]);

  const filtered = useMemo(
    () => (filter === "all" ? issues : issues.filter((i) => i.issue_type === filter)),
    [issues, filter]
  );

  const active = issues.filter((i) => i.status !== "RESOLVED").length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pb-24"
    >
      <div className="sticky top-0 z-30 glass px-4 pb-2 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Serilingampalle, Hyderabad</p>
            <h1 className="text-xl font-black text-white">Community Feed</h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${connected ? "bg-verified" : "bg-gray-500"}`}
            />
            <span className="text-gray-400">{connected ? "Live" : "Offline"}</span>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/5 bg-black/20">
          <Globe3D issues={issues} height={260} />
          <div className="flex items-center justify-around border-t border-white/5 py-2 text-center">
            <Stat label="Active" value={active} color="#FFB800" />
            <Stat label="Verified" value={issues.filter((i) => i.status === "VERIFIED").length} color="#00E5C3" />
            <Stat label="Resolved" value={issues.filter((i) => i.status === "RESOLVED").length} color="#22C55E" />
          </div>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                filter === f ? "bg-teal text-midnight" : "glass text-gray-300"
              }`}
            >
              {f === "all" ? "All" : f.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2.5">
          {filtered.map((i) => (
            <IssueCard key={i.id} issue={i} />
          ))}
          {!filtered.length && (
            <p className="py-10 text-center text-sm text-gray-500">No issues here yet.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-lg font-black" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}
