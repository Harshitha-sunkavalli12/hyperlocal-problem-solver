import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setSession } from "../lib/auth";

export default function OfficialLogin() {
  const nav = useNavigate();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (!handle.trim() || !password) {
      setError("Enter your official handle and password.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.officialLogin(handle, password);
      setSession({
        token: res.token,
        handle: res.user.handle,
        role: "official",
        xp: res.user.xp ?? 0,
        badges: res.user.badges ?? [],
      });
      nav("/dashboard"); // straight to the PC web layout
    } catch (e: any) {
      const msg = String(e.message || "");
      setError(msg.replace(/^\d+:\s*/, "").replace(/[{}"]/g, "").slice(0, 120) || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  function useDemo() {
    setHandle("ghmc_official");
    setPassword("official123");
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Left brand panel (PC layout) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0b1430] to-[#0A0F1E] p-12 lg:flex">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber">
            Community Hero · Government Portal
          </p>
          <h1 className="mt-4 max-w-md text-4xl font-black leading-tight text-white">
            Accountability, in real time.
          </h1>
          <p className="mt-3 max-w-md text-sm text-gray-400">
            Monitor citizen reports, department SLA compliance, predictive maintenance
            hotspots and resolution impact across your jurisdiction.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <Stat value="94%" label="SLA compliance" />
          <Stat value="₹2.3Cr" label="Repairs saved" />
          <Stat value="847" label="Issues fixed" />
        </div>
        <p className="text-xs text-gray-600">Authorized municipal personnel only.</p>
      </div>

      {/* Right login card */}
      <div className="flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <button onClick={() => nav("/login")} className="mb-6 text-sm text-gray-400">
            ← Back to citizen app
          </button>

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber/15 text-2xl">
              🏛️
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Officials Login</h2>
              <p className="text-xs text-gray-400">GHMC department dashboard</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Official handle</label>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="ghmc_official"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-gray-100 outline-none focus:border-amber"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-gray-100 outline-none focus:border-amber"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={submit}
              disabled={busy}
              className="w-full rounded-2xl bg-amber py-3.5 text-base font-bold text-midnight shadow-glowamber disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Access dashboard →"}
            </button>

            <button
              onClick={useDemo}
              className="w-full rounded-2xl border border-white/10 py-3 text-xs font-semibold text-gray-300"
            >
              Use demo credentials (ghmc_official / official123)
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
      <div className="text-xl font-black text-teal">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}
