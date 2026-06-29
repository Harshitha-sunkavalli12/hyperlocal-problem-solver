import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Globe3D from "../components/Globe3D";
import MapView from "../components/MapView";
import { api, TYPE_ICON, TYPE_LABEL } from "../lib/api";
import { getSession } from "../lib/auth";
import type { DashboardStats, Issue, Prediction } from "../lib/types";

export default function Dashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api.stats().then(setStats).catch((e) => setError(String(e?.message || e)));
    api.listIssues().then(setIssues).catch(() => {});
    api.predictions().then(setPreds).catch(() => {});
  };
  useEffect(() => {
    load();
  }, []);

  if (error) {
    const denied = error.includes("401") || error.includes("403");
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-4xl">{denied ? "🔒" : "📡"}</div>
        <h1 className="text-lg font-bold text-white">
          {denied ? "Officials access required" : "Couldn't load the dashboard"}
        </h1>
        <p className="text-sm text-gray-400">
          {denied
            ? "Please sign in with an official account to view the dashboard."
            : "The backend isn't reachable. Make sure the API server is running on port 8000."}
        </p>
        <pre className="max-w-full overflow-auto rounded-xl bg-black/40 p-3 text-left text-[11px] text-red-300">
          {error}
        </pre>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-2xl bg-teal px-5 py-3 text-sm font-bold text-midnight">
            Retry
          </button>
          <button
            onClick={() => nav(denied ? "/official-login" : "/login")}
            className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-200"
          >
            {denied ? "Official login" : "Back to login"}
          </button>
        </div>
      </div>
    );
  }

  if (!stats)
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Loading dashboard…
      </div>
    );

  const resolutionRate = stats.total_reported
    ? Math.round((stats.total_resolved / stats.total_reported) * 100)
    : 0;

  return (
    <div className="min-h-screen w-full px-6 py-6 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal">
            Community Hero · Officials
          </p>
          <h1 className="text-2xl font-black text-white">Impact Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => api.runInsights().then(load)} className="glass rounded-xl px-3 py-2 text-xs text-gray-200">
            🔮 Run insights
          </button>
          <button onClick={() => api.runSla().then(load)} className="glass rounded-xl px-3 py-2 text-xs text-gray-200">
            ⏰ SLA sweep
          </button>
          <a href={`/api/dashboard/export.csv?token=${getSession()?.token ?? ""}`} className="glass rounded-xl px-3 py-2 text-xs text-gray-200">
            ⬇ Export CSV
          </a>
          <button onClick={() => nav("/home")} className="rounded-xl bg-teal px-3 py-2 text-xs font-bold text-midnight">
            Citizen app
          </button>
        </div>
      </header>

      {/* Impact headline */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Potholes fixed" value={stats.impact_potholes_fixed.toLocaleString()} accent="#22C55E" sub="all-time" />
        <Kpi label="Saved in repairs" value={`₹${stats.impact_money_saved_cr} Cr`} accent="#00E5C3" sub="emergency repairs avoided" />
        <Kpi label="Resolution rate" value={`${resolutionRate}%`} accent="#FFB800" sub={`${stats.total_resolved}/${stats.total_reported}`} />
        <Kpi label="Avg resolution" value={`${stats.avg_resolution_hours}h`} accent="#A78BFA" sub="time to fix" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Globe */}
        <div className="rounded-2xl border border-white/10 bg-black/20 lg:col-span-2">
          <div className="flex items-center justify-between px-4 pt-3">
            <h2 className="text-sm font-bold text-white">Live City Map</h2>
            <span className="text-xs text-gray-400">{stats.active_issues} active issues</span>
          </div>
          <Globe3D issues={issues} height={380} />
          <div className="border-t border-white/5 p-3">
            <div className="mb-2 text-xs font-semibold text-gray-300">
              🗺️ Google Maps issue-density heatmap
            </div>
            <MapView issues={issues} heatmap height={260} />
          </div>
        </div>

        {/* SLA compliance */}
        <div className="rounded-2xl border border-white/10 bg-surface/60 p-4">
          <h2 className="mb-3 text-sm font-bold text-white">Department SLA Compliance</h2>
          <div className="space-y-3">
            {Object.entries(stats.sla_compliance).length === 0 && (
              <p className="text-xs text-gray-500">No resolved issues yet.</p>
            )}
            {Object.entries(stats.sla_compliance).map(([dept, rate]) => (
              <div key={dept}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-gray-300">{dept.replace("GHMC ", "").replace("HMWSSB ", "")}</span>
                  <span className="font-bold" style={{ color: rate >= 80 ? "#22C55E" : rate >= 50 ? "#FFB800" : "#EF4444" }}>
                    {rate}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${rate}%`, background: rate >= 80 ? "#22C55E" : rate >= 50 ? "#FFB800" : "#EF4444" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* By type */}
        <div className="rounded-2xl border border-white/10 bg-surface/60 p-4">
          <h2 className="mb-3 text-sm font-bold text-white">Issues by Category</h2>
          <div className="space-y-2">
            {Object.entries(stats.by_type)
              .sort((a, b) => b[1] - a[1])
              .map(([t, c]) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="w-6">{TYPE_ICON[t]}</span>
                  <span className="flex-1 text-xs text-gray-300">{TYPE_LABEL[t]}</span>
                  <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-teal" style={{ width: `${(c / stats.total_reported) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-xs font-bold text-white">{c}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Predictive insights */}
        <div className="rounded-2xl border border-white/10 bg-surface/60 p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold text-white">
            🔮 Predictive Maintenance <span className="text-xs font-normal text-gray-400">(Insights Agent)</span>
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {preds.slice(0, 6).map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-white/5 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-200">
                    {TYPE_ICON[p.issue_type]} {p.zone}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: p.probability >= 0.7 ? "#EF444422" : "#FFB80022",
                      color: p.probability >= 0.7 ? "#EF4444" : "#FFB800",
                    }}
                  >
                    {Math.round(p.probability * 100)}% risk
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-gray-400">{p.reasoning}</p>
              </motion.div>
            ))}
            {!preds.length && <p className="text-xs text-gray-500">Run insights to generate predictions.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, sub }: { label: string; value: string; accent: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface/60 p-4">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-black" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-[10px] text-gray-500">{sub}</div>
    </div>
  );
}
