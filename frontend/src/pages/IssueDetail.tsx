import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import StatusTracker from "../components/StatusTracker";
import AgentTrace from "../components/AgentTrace";
import { api, ME, STATUS_COLOR, TYPE_ICON, TYPE_LABEL } from "../lib/api";
import { useWebSocket } from "../lib/useWebSocket";
import type { Issue } from "../lib/types";

export default function IssueDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (id) api.getIssue(id).then(setIssue).catch(() => {});
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useWebSocket((m) => {
    if (m.payload?.issue_id === id) load();
  });

  if (!issue) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>;
  }

  const color = STATUS_COLOR[issue.status];

  async function vote() {
    setBusy(true);
    try {
      await api.vote(issue!.id, `voter_${Math.random().toString(36).slice(2, 7)}`, 1);
      load();
    } catch (e: any) {
      alert(e.message?.includes("409") ? "Already voted." : "Vote failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resolve() {
    setBusy(true);
    try {
      await api.resolve(issue!.id, `https://picsum.photos/seed/proof${Date.now() % 999}/600/400`, "Fixed by field team");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function progress() {
    setBusy(true);
    try {
      await api.progress(issue!.id);
      load();
    } finally {
      setBusy(false);
    }
  }

  const toVerify = Math.max(0, 10 - issue.upvotes);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pb-28"
    >
      <div className="relative">
        {issue.image_url && (
          <img src={issue.image_url} alt="" className="h-52 w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight to-transparent" />
        <button
          onClick={() => nav(-1)}
          className="absolute left-4 top-5 flex h-9 w-9 items-center justify-center rounded-full glass text-gray-200"
        >
          ←
        </button>
        <span
          className="absolute right-4 top-5 rounded-full px-3 py-1 text-xs font-bold"
          style={{ background: color, color: "#0A0F1E" }}
        >
          {issue.status.replace("_", " ")}
        </span>
      </div>

      <div className="-mt-8 space-y-4 px-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{TYPE_ICON[issue.issue_type]} {TYPE_LABEL[issue.issue_type]}</span>
            <span>·</span>
            <span>Severity {issue.severity}/5</span>
            <span>·</span>
            <span>{issue.zone}</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-white">{issue.title}</h1>
          {issue.description && <p className="mt-1 text-sm text-gray-300">{issue.description}</p>}
        </div>

        <div className="glass rounded-2xl p-4">
          <StatusTracker status={issue.status} />
        </div>

        {/* Routing / SLA info */}
        {issue.department && (
          <div className="glass grid grid-cols-3 gap-2 rounded-2xl p-3 text-center">
            <Info label="Department" value={issue.department.replace("GHMC ", "").replace("HMWSSB ", "")} />
            <Info label="Priority" value={issue.priority_score.toFixed(0)} />
            <Info label="ETA" value={issue.eta_hours ? `${issue.eta_hours}h` : "—"} />
          </div>
        )}

        {/* Community validation */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Community Validation</div>
              <div className="text-xs text-gray-400">
                {issue.upvotes} upvotes
                {toVerify > 0 && issue.status === "REPORTED"
                  ? ` · ${toVerify} more to verify`
                  : " · verified ✓"}
              </div>
            </div>
            <button
              onClick={vote}
              disabled={busy}
              className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-midnight disabled:opacity-50"
            >
              ▲ Upvote
            </button>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-teal transition-all"
              style={{ width: `${Math.min(100, (issue.upvotes / 10) * 100)}%` }}
            />
          </div>
        </div>

        {/* AI transparency log */}
        <div>
          <h2 className="mb-2 text-sm font-bold text-white">🤖 AI Agent Activity</h2>
          <AgentTrace reasonings={issue.reasonings || []} />
        </div>

        {/* Demo controls (acts as field worker / department) */}
        {issue.status !== "RESOLVED" && (
          <div className="flex gap-2">
            {issue.status === "ASSIGNED" && (
              <button
                onClick={progress}
                disabled={busy}
                className="flex-1 rounded-xl bg-white/10 py-3 text-sm font-semibold text-gray-200"
              >
                🚧 Start work
              </button>
            )}
            {(issue.status === "ASSIGNED" || issue.status === "IN_PROGRESS") && (
              <button
                onClick={resolve}
                disabled={busy}
                className="flex-1 rounded-xl bg-verified py-3 text-sm font-bold text-midnight"
              >
                ✅ Upload proof & resolve
              </button>
            )}
          </div>
        )}

        {issue.status === "RESOLVED" && issue.proof_image_url && (
          <div>
            <h2 className="mb-2 text-sm font-bold text-verified">✅ Resolved — proof of fix</h2>
            <div className="grid grid-cols-2 gap-2">
              <figure>
                <img src={issue.image_url} className="aspect-video w-full rounded-xl object-cover" alt="before" />
                <figcaption className="mt-1 text-center text-[10px] text-gray-500">Before</figcaption>
              </figure>
              <figure>
                <img src={issue.proof_image_url} className="aspect-video w-full rounded-xl object-cover" alt="after" />
                <figcaption className="mt-1 text-center text-[10px] text-gray-500">After</figcaption>
              </figure>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="truncate text-sm font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}
