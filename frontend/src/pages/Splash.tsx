import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Globe3D from "../components/Globe3D";
import { api } from "../lib/api";
import { isAuthed } from "../lib/auth";
import type { Issue } from "../lib/types";

export default function Splash() {
  const nav = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    api.listIssues().then(setIssues).catch(() => {});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen flex-col items-center justify-between px-6 py-10"
    >
      <div className="text-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal">
            Community Hero
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-white">
            Your city, <span className="text-teal">in your hands</span>
          </h1>
        </motion.div>
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="w-full"
      >
        <Globe3D issues={issues} height={360} />
      </motion.div>

      <div className="w-full space-y-4 text-center">
        <p className="text-sm text-gray-400">
          Report. Validate. Track. Resolve. Powered by a 5-agent AI pipeline and a
          live 3D city map.
        </p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => nav(isAuthed() ? "/home" : "/login")}
          className="w-full rounded-2xl bg-teal py-4 text-base font-bold text-midnight shadow-glow"
        >
          {isAuthed() ? "Enter the city →" : "Get started →"}
        </motion.button>
        <button
          onClick={() => nav("/dashboard")}
          className="text-xs text-gray-500 underline"
        >
          Open officials dashboard
        </button>
      </div>
    </motion.div>
  );
}
