import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api, ME } from "../lib/api";
import { useWebSocket } from "../lib/useWebSocket";
import type { NotificationItem } from "../lib/types";

const KIND_ICON: Record<string, string> = {
  nearby: "📍",
  resolved: "🎉",
  info: "🔔",
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Notifications() {
  const nav = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);

  const load = () => api.notifications(ME()).then(setItems).catch(() => {});
  useEffect(() => {
    load();
  }, []);
  useWebSocket(() => load());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen px-4 pb-24 pt-6"
    >
      <h1 className="text-xl font-black text-white">Notifications</h1>

      <div className="mt-4 space-y-2">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => n.issue_id && nav(`/issue/${n.issue_id}`)}
            className="glass flex w-full items-start gap-3 rounded-xl p-3 text-left"
          >
            <span className="text-xl">{KIND_ICON[n.kind] || "🔔"}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{n.title}</div>
              <div className="text-xs text-gray-400">{n.body}</div>
              <div className="mt-0.5 text-[10px] text-gray-500">{timeAgo(n.created_at)}</div>
            </div>
          </button>
        ))}
        {!items.length && (
          <p className="py-10 text-center text-sm text-gray-500">No notifications yet.</p>
        )}
      </div>
    </motion.div>
  );
}
