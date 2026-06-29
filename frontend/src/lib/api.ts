import type {
  Analysis,
  DashboardStats,
  Issue,
  LeaderboardEntry,
  NotificationItem,
  Prediction,
} from "./types";
import { getSession } from "./auth";

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (session?.token) headers["X-Auth-Handle"] = session.token;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  signup: (body: { handle: string; password: string; email?: string; locality?: string }) =>
    req<{ token: string; role: string; user: any }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (handle: string, password: string) =>
    req<{ token: string; role: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ handle, password }),
    }),

  officialLogin: (handle: string, password: string) =>
    req<{ token: string; role: string; user: any }>("/auth/official/login", {
      method: "POST",
      body: JSON.stringify({ handle, password }),
    }),

  guest: () => req<{ token: string; role: string; user: any }>("/auth/guest", { method: "POST" }),

  social: (handle: string, email = "") =>
    req<{ token: string; role: string; user: any }>("/auth/social", {
      method: "POST",
      body: JSON.stringify({ handle, email }),
    }),

  analyze: (hint: string, image_url = "") =>
    req<Analysis>("/issues/analyze", {
      method: "POST",
      body: JSON.stringify({ hint, image_url }),
    }),

  createIssue: (body: {
    title?: string;
    description: string;
    lat: number;
    lng: number;
    zone?: string;
    address?: string;
    image_url?: string;
    issue_type?: string;
    reporter_handle: string;
  }) => req<Issue>("/issues", { method: "POST", body: JSON.stringify(body) }),

  listIssues: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return req<Issue[]>(`/issues${q ? `?${q}` : ""}`);
  },

  getIssue: (id: string) => req<Issue>(`/issues/${id}`),

  vote: (id: string, user_handle: string, value = 1, photo_url = "") =>
    req<Issue>(`/issues/${id}/vote`, {
      method: "POST",
      body: JSON.stringify({ user_handle, value, photo_url }),
    }),

  progress: (id: string) => req<Issue>(`/issues/${id}/progress`, { method: "POST" }),

  resolve: (id: string, proof_image_url: string, note = "") =>
    req<Issue>(`/issues/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ proof_image_url, note }),
    }),

  leaderboard: (locality?: string) =>
    req<LeaderboardEntry[]>(`/leaderboard${locality ? `?locality=${locality}` : ""}`),

  user: (handle: string) => req<any>(`/users/${handle}`),
  userIssues: (handle: string) => req<Issue[]>(`/users/${handle}/issues`),
  notifications: (handle: string) => req<NotificationItem[]>(`/notifications/${handle}`),

  stats: () => req<DashboardStats>("/dashboard/stats"),
  predictions: () => req<Prediction[]>("/dashboard/predictions"),
  runInsights: () => req<any>("/dashboard/run-insights", { method: "POST" }),
  runSla: () => req<any>("/dashboard/run-sla-monitor", { method: "POST" }),
};

export { me as ME } from "./auth";

export const TYPE_LABEL: Record<string, string> = {
  pothole: "Pothole",
  water_leak: "Water Leak",
  streetlight: "Streetlight",
  garbage: "Garbage",
  infrastructure: "Infrastructure",
  other: "Other",
};

export const TYPE_ICON: Record<string, string> = {
  pothole: "🕳️",
  water_leak: "💧",
  streetlight: "💡",
  garbage: "🗑️",
  infrastructure: "🏗️",
  other: "📍",
};

export const STATUS_COLOR: Record<string, string> = {
  REPORTED: "#FFB800",
  VERIFIED: "#00E5C3",
  ASSIGNED: "#60A5FA",
  IN_PROGRESS: "#A78BFA",
  RESOLVED: "#22C55E",
};
