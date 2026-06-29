import { useEffect, useMemo, useRef, useState } from "react";
import { hasMaps, loadGoogleMaps, mapsLoadError } from "../lib/googleMaps";
import { STATUS_COLOR } from "../lib/api";
import type { Issue } from "../lib/types";

const HYD = { lat: 17.4948, lng: 78.303 };

// Dark map style to match the civic theme.
const DARK_STYLE: any[] = [
  { elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7d8aa3" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0f1e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1b2740" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1530" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

interface Props {
  issues?: Issue[];
  height?: number;
  pickable?: boolean;
  heatmap?: boolean;
  center?: { lat: number; lng: number };
  onPick?: (lat: number, lng: number) => void;
}

export default function MapView({
  issues = [],
  height = 240,
  pickable = false,
  heatmap = false,
  center = HYD,
  onPick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const pickMarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Init map once.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled) return;
        if (!g || !g.maps || !ref.current) {
          setFailed(true);
          return;
        }
        try {
          mapRef.current = new g.maps.Map(ref.current, {
            center,
            zoom: 13,
            disableDefaultUI: true,
            zoomControl: true,
            styles: DARK_STYLE,
          });
          if (pickable && onPick) {
            mapRef.current.addListener("click", (e: any) => {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              if (pickMarkerRef.current) pickMarkerRef.current.setMap(null);
              pickMarkerRef.current = new g.maps.Marker({
                position: { lat, lng },
                map: mapRef.current,
              });
              onPick(lat, lng);
            });
          }
          setReady(true);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("Google Maps init failed:", err);
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render issue markers / heatmap.
  useEffect(() => {
    const g = (window as any).google;
    if (!ready || !g || !g.maps || !mapRef.current) return;

    try {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      if (heatmap && g.maps.visualization) {
        const data = issues.map((i) => new g.maps.LatLng(i.lat, i.lng));
        const layer = new g.maps.visualization.HeatmapLayer({ data, radius: 32, opacity: 0.75 });
        layer.setMap(mapRef.current);
        markersRef.current.push({ setMap: (v: any) => layer.setMap(v) });
      } else {
        issues.forEach((i) => {
          const marker = new g.maps.Marker({
            position: { lat: i.lat, lng: i.lng },
            map: mapRef.current,
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: STATUS_COLOR[i.status] || "#00E5C3",
              fillOpacity: 0.95,
              strokeColor: "#0A0F1E",
              strokeWeight: 1.5,
            },
          });
          markersRef.current.push(marker);
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Google Maps render failed:", err);
    }
  }, [issues, ready, heatmap]);

  // No key configured, or the API failed to load → show an informative fallback
  // (for heatmaps we render a zone-density visualization so the panel is useful).
  if (!hasMaps() || failed) {
    return (
      <FallbackPanel
        issues={issues}
        height={height}
        heatmap={heatmap}
        pickable={pickable}
        reason={!hasMaps() ? "no-key" : "load-failed"}
      />
    );
  }

  return <div ref={ref} style={{ height }} className="w-full overflow-hidden rounded-2xl bg-[#0e1626]" />;
}

/** Pure-CSS fallback: zone-density bars for heatmaps, a note otherwise. */
function FallbackPanel({
  issues,
  height,
  heatmap,
  pickable,
  reason,
}: {
  issues: Issue[];
  height: number;
  heatmap: boolean;
  pickable: boolean;
  reason: "no-key" | "load-failed";
}) {
  const byZone = useMemo(() => {
    const m = new Map<string, number>();
    issues.forEach((i) => m.set(i.zone, (m.get(i.zone) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [issues]);
  const max = byZone.length ? byZone[0][1] : 1;

  const note =
    reason === "no-key"
      ? "Set VITE_GOOGLE_MAPS_API_KEY to enable the live Google Maps heatmap."
      : mapsLoadError ||
        "Google Maps could not load. Enable the Maps JavaScript API and allow localhost as a referrer.";

  if (heatmap && byZone.length) {
    return (
      <div
        style={{ minHeight: height }}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e1626] to-black/40 p-4"
      >
        <div className="mb-3 text-[11px] text-gray-400">Issue density by zone</div>
        <div className="space-y-2">
          {byZone.map(([zone, count]) => {
            const pct = Math.round((count / max) * 100);
            return (
              <div key={zone} className="flex items-center gap-2">
                <span className="w-28 truncate text-xs text-gray-300">{zone}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background:
                        pct > 66
                          ? "linear-gradient(90deg,#FFB800,#EF4444)"
                          : pct > 33
                          ? "linear-gradient(90deg,#00E5C3,#FFB800)"
                          : "#00E5C3",
                    }}
                  />
                </div>
                <span className="w-6 text-right text-xs font-bold text-white">{count}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[10px] leading-snug text-gray-500">⚠️ {note}</p>
      </div>
    );
  }

  return (
    <div
      style={{ height }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-center"
    >
      <div className="text-3xl">🗺️</div>
      <p className="mt-2 px-4 text-xs text-gray-400">
        {note}
        {pickable && " Using GPS coordinates for now."}
      </p>
    </div>
  );
}
