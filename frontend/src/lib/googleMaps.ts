// Dynamic Google Maps JS API loader (Req: Google Maps Platform).
// Activates when VITE_GOOGLE_MAPS_API_KEY is set; otherwise callers fall back.
let loader: Promise<any> | null = null;
export let mapsLoadError: string | null = null;

export function mapsKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || "";
}

export function hasMaps(): boolean {
  return !!mapsKey();
}

export function loadGoogleMaps(): Promise<any> {
  if (!hasMaps()) return Promise.resolve(null);
  if (loader) return loader;

  loader = new Promise((resolve) => {
    if ((window as any).google?.maps) {
      resolve((window as any).google);
      return;
    }

    // Google calls this global when the key/billing/referrer is invalid.
    (window as any).gm_authFailure = () => {
      mapsLoadError =
        "Google rejected the API key (check that Maps JavaScript API is enabled, billing is on, and localhost is an allowed referrer).";
      resolve(null);
    };

    const params = new URLSearchParams({
      key: mapsKey(),
      libraries: "visualization",
      v: "weekly",
      loading: "async",
    });
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;

    const timeout = window.setTimeout(() => {
      mapsLoadError = "Google Maps script timed out.";
      resolve(null);
    }, 10000);

    s.onload = () => {
      window.clearTimeout(timeout);
      if ((window as any).google?.maps) {
        resolve((window as any).google);
      } else {
        mapsLoadError = "Google Maps script loaded but the API was unavailable.";
        resolve(null);
      }
    };
    s.onerror = () => {
      window.clearTimeout(timeout);
      mapsLoadError = "Failed to load the Google Maps script (network or blocked request).";
      resolve(null);
    };
    document.head.appendChild(s);
  });
  return loader;
}
