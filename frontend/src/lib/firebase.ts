// Firebase Google sign-in adapter (graceful — activates only when configured).
// Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID.
// The SDK is loaded from CDN at runtime so no npm dependency is required.
const env = import.meta.env as Record<string, string>;

export function hasFirebase(): boolean {
  return !!env.VITE_FIREBASE_API_KEY && !!env.VITE_FIREBASE_AUTH_DOMAIN;
}

export interface SocialIdentity {
  handle: string;
  email: string;
}

export async function signInWithGoogle(): Promise<SocialIdentity> {
  if (!hasFirebase()) throw new Error("Firebase is not configured.");

  const APP_URL = "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
  const AUTH_URL = "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
  const appMod: any = await import(/* @vite-ignore */ APP_URL);
  const authMod: any = await import(/* @vite-ignore */ AUTH_URL);

  const app = appMod.initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
  });
  const auth = authMod.getAuth(app);
  const provider = new authMod.GoogleAuthProvider();
  const result = await authMod.signInWithPopup(auth, provider);
  const user = result.user;
  const handle = (user.email || user.uid).split("@")[0].replace(/[^a-z0-9_]/gi, "_");
  return { handle, email: user.email || "" };
}
