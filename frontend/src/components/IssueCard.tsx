import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Issue } from "../lib/types";
import { STATUS_COLOR, TYPE_ICON, TYPE_LABEL } from "../lib/api";

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function IssueCard({ issue }: { issue: Issue }) {
  const nav = useNavigate();
  const color = STATUS_COLOR[issue.status];
  return (
    <motion.button
      layout
      whileTap={{ scale: 0.98 }}
      onClick={() => nav(`/issue/${issue.id}`)}
      className="glass w-full rounded-2xl p-3 text-left"
    >
      <div className="flex gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/30">
          {issue.image_url ? (
            <img src={issue.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              {TYPE_ICON[issue.issue_type]}
            </div>
          )}
          <span
            className="absolute left-1 top-1 rounded-md px-1 text-[9px] font-bold text-midnight"
            style={{ background: color }}
          >
            S{issue.severity}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-gray-100">{issue.title}</span>
            <span className="shrink-0 text-[10px] text-gray-400">{timeAgo(issue.created_at)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
            <span>{TYPE_ICON[issue.issue_type]} {TYPE_LABEL[issue.issue_type]}</span>
            <span>·</span>
            <span>{issue.zone}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: `${color}22`, color }}
            >
              {issue.status.replace("_", " ")}
            </span>
            <span className="text-[11px] text-gray-300">▲ {issue.upvotes}</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
