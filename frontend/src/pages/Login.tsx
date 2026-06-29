import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Globe3D from "../components/Globe3D";
import { api } from "../lib/api";
import { setSession } from "../lib/auth";
import { hasFirebase, signInWithGoogle } from "../lib/firebase";

type Mode = "login" | "signup";

const LOCALITIES = ["Serilingampalle", "Miyapur", "Kondapur", "Gachibowli", "Madhapur"];

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [locality, setLocality] = useState(LOCALITIES[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function persist(res: { token: string; role: string; user: any }) {
    setSession({
      token: res.token,
      handle: res.user.handle,
      role: (res.role as "citizen" | "official") ?? "citizen",
      xp: res.user.xp ?? 0,
      badges: res.user.badges ?? [],
    });
    nav("/home");
  }

  async function submit() {
    setError("");
    if (!handle.trim() || !password) {
      setError("Please enter a handle and password.");
      return;
    }
    if (mode === "signup") {
      if (handle.trim().length < 3) return setError("Handle must be at least 3 characters.");
      if (password.length < 4) return setError("Password must be at least 4 characters.");
      if (password !== confirm) return setError("Passwords do not match.");
    }
    setBusy(true);
    try {
      const res =
        mode === "signup"
          ? await api.signup({ handle, password, email, locality })
          : await api.login(handle, password);
      persist(res);
    } catch (e: any) {
      const msg = String(e.message || "");
      setError(msg.replace(/^\d+:\s*/, "").replace(/[{}"]/g, "").slice(0, 120) || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function guest() {
    setBusy(true);
    try {
      persist(await api.guest());
    } catch {
      setError("Could not start guest session.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError("");
    setBusy(true);
    try {
      const id = await signInWithGoogle();
      persist(await api.social(id.handle, id.email));
    } catch (e: any) {
      setError(e?.message?.slice(0, 120) || "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex min-h-screen flex-col px-6 pb-8 pt-10"
    >
      {/* Hero globe */}
      <div className="pointer-events-none absolute inset-x-0 top-0 opacity-70">
        <Globe3D issues={[]} height={240} interactive={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-midnight" />
      </div>

      <div className="relative mt-40">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal">Community Hero</p>
        <h1 className="mt-1 text-3xl font-black leading-tight text-white">
          {mode === "login" ? "Welcome back" : "Join the movement"}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {mode === "login"
            ? "Sign in to report and track civic issues."
            : "Create a free account — your reports stay pseudonymous."}
        </p>
      </div>

      {/* Toggle */}
      <div className="relative mt-6 grid grid-cols-2 rounded-2xl bg-white/5 p-1 text-sm font-semibold">
        {(["login", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError("");
            }}
            className="relative rounded-xl py-2.5 text-center"
          >
            {mode === m && (
              <motion.span
                layoutId="auth-pill"
                className="absolute inset-0 rounded-xl bg-teal"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className={`relative ${mode === m ? "text-midnight" : "text-gray-300"}`}>
              {m === "login" ? "Log in" : "Sign up"}
            </span>
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="relative mt-5 space-y-3">
        <Field label="Handle" value={handle} onChange={setHandle} placeholder="e.g. arjun_h" autoCapitalize="none" />

        <AnimatePresence mode="popLayout">
          {mode === "signup" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <Field label="Email (optional)" value={email} onChange={setEmail} placeholder="you@example.com" type="email" autoCapitalize="none" />
              <div>
                <label className="mb-1 block text-xs text-gray-400">Locality</label>
                <select
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-gray-100 outline-none focus:border-teal"
                >
                  {LOCALITIES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Field label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />

        <AnimatePresence mode="popLayout">
          {mode === "signup" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Field label="Confirm password" value={confirm} onChange={setConfirm} placeholder="••••••••" type="password" />
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-2xl bg-teal py-4 text-base font-bold text-midnight shadow-glow disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "login" ? "Log in →" : "Create account →"}
        </button>

        <div className="flex items-center gap-3 py-1 text-[11px] text-gray-500">
          <div className="h-px flex-1 bg-white/10" />
          or
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          onClick={google}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-semibold text-gray-800 disabled:opacity-60"
        >
          <span className="text-base">🔵</span> Continue with Google
          {!hasFirebase() && <span className="text-[10px] text-gray-500">(set Firebase keys)</span>}
        </button>

        <button
          onClick={guest}
          disabled={busy}
          className="w-full rounded-2xl border border-white/10 py-3 text-sm font-semibold text-gray-200"
        >
          👤 Continue as guest (demo)
        </button>

        <button
          onClick={() => nav("/official-login")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber/30 bg-amber/10 py-3 text-sm font-semibold text-amber"
        >
          🏛️ Officials login →
        </button>
      </div>
    </motion.div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoCapitalize?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        autoCapitalize={autoCapitalize}
        autoCorrect="off"
        className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-gray-100 outline-none focus:border-teal"
      />
    </div>
  );
}
