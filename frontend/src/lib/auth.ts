// Lightweight client-side session store for the app.
const KEY = "ch_session";

export interface Session {
  token: string;
  handle: string;
  role: "citizen" | "official";
  xp: number;
  badges: string[];
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

export function isAuthed(): boolean {
  return !!getSession();
}

export function isOfficial(): boolean {
  return getSession()?.role === "official";
}

/** Current user handle, falling back to the demo account. */
export function me(): string {
  return getSession()?.handle ?? "demo_citizen";
}
