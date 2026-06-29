import { motion } from "framer-motion";
import type { Reasoning } from "../lib/types";

const AGENT_META: Record<string, { icon: string; color: string }> = {
  "Intake Agent": { icon: "🔍", color: "#00E5C3" },
  "Validation Agent": { icon: "🤝", color: "#FFB800" },
  "Routing Agent": { icon: "🧭", color: "#60A5FA" },
  "Resolution Agent": { icon: "✅", color: "#22C55E" },
  "Insights Agent": { icon: "📊", color: "#A78BFA" },
};

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, string> = {
    gemini: "Gemini Vision",
    claude: "Claude",
    mock: "AI (demo)",
    rule: "Rule engine",
  };
  return (
    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-300">
      {map[source] || source}
    </span>
  );
}

/** Transparent log of every AI decision (Req 16). */
export default function AgentTrace({ reasonings }: { reasonings: Reasoning[] }) {
  if (!reasonings?.length) return null;
  return (
    <div className="space-y-2">
      {reasonings.map((r, i) => {
        const meta = AGENT_META[r.agent] || { icon: "🤖", color: "#00E5C3" };
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass rounded-xl p-3"
            style={{ borderLeft: `3px solid ${meta.color}` }}
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{meta.icon}</span>
                <span style={{ color: meta.color }}>{r.agent}</span>
              </div>
              <SourceBadge source={r.source} />
            </div>
            <p className="text-xs leading-relaxed text-gray-300">{r.summary}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
