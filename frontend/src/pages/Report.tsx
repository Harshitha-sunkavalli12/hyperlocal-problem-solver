import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api, ME, TYPE_ICON, TYPE_LABEL } from "../lib/api";
import MapView from "../components/MapView";
import type { Analysis } from "../lib/types";

type Step = "capture" | "analyzing" | "form";

const SAMPLES = [
  { hint: "deep pothole full of water on the main road", img: "pothole" },
  { hint: "water pipe leaking onto the street", img: "water_leak" },
  { hint: "streetlight not working, dark stretch", img: "streetlight" },
  { hint: "garbage pile uncollected for days", img: "garbage" },
];

export default function Report() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("capture");
  const [hint, setHint] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [desc, setDesc] = useState("");
  const [coords, setCoords] = useState({ lat: 17.4948, lng: 78.303 });
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [uploading, setUploading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GPS auto-fill (Feature 1).
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {},
        { timeout: 4000 }
      );
    }
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function runAnalysis(sampleHint: string, img: string) {
    setHint(sampleHint);
    setImageUrl(`https://picsum.photos/seed/${img}${Date.now() % 1000}/600/400`);
    setStep("analyzing");
    try {
      const a = await api.analyze(sampleHint);
      // Show the "Gemini is analyzing..." beat.
      setTimeout(() => {
        setAnalysis(a);
        setDesc(sampleHint);
        setStep("form");
      }, 1400);
    } catch {
      setStep("form");
    }
  }

  // Handle file upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Convert to base64 for preview
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setImageUrl(dataUrl);
        setStep("analyzing");

        // Analyze the uploaded image
        try {
          const a = await api.analyze(hint || "uploaded image", dataUrl);
          setTimeout(() => {
            setAnalysis(a);
            setDesc(hint || a.reasoning || "Issue detected in uploaded image");
            setStep("form");
          }, 1400);
        } catch {
          setStep("form");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  // Trigger file input
  function openFileUpload() {
    fileInputRef.current?.click();
  }

  // Voice-to-text (Web Speech API, Req 17).
  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setDesc((d) => (d ? d + " " : "") + text);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function submit() {
    setSubmitting(true);
    let resolvedZone = "Serilingampalle";
    let resolvedAddress = "Serilingampalle, Hyderabad, Telangana";

    if ((window as any).google?.maps?.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        const response = await geocoder.geocode({ location: coords });
        if (response.results && response.results.length > 0) {
          resolvedAddress = response.results[0].formatted_address;
          const ac = response.results[0].address_components;
          const subloc = ac.find((c: any) => c.types.includes("sublocality") || c.types.includes("locality"));
          if (subloc) resolvedZone = subloc.long_name;
        }
      } catch (e) {
        console.warn("Geocoding failed", e);
      }
    }

    const body = {
      title: analysis && analysis.issue_type ? TYPE_LABEL[analysis.issue_type] : "Reported issue",
      description: desc,
      lat: coords.lat,
      lng: coords.lng,
      zone: resolvedZone,
      address: resolvedAddress,
      image_url: imageUrl,
      issue_type: analysis?.issue_type,
      reporter_handle: ME(),
    };
    if (offline) {
      const q = JSON.parse(localStorage.getItem("offline_queue") || "[]");
      q.push(body);
      localStorage.setItem("offline_queue", JSON.stringify(q));
      alert("📥 Saved offline. Will sync when you're back online.");
      nav("/home");
      return;
    }
    try {
      const issue = await api.createIssue(body);
      nav(`/issue/${issue.id}`);
    } catch (e) {
      alert("Failed to submit. Saved offline instead.");
      const q = JSON.parse(localStorage.getItem("offline_queue") || "[]");
      q.push(body);
      localStorage.setItem("offline_queue", JSON.stringify(q));
      nav("/home");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-screen px-4 pb-28 pt-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="text-gray-400">
          ←
        </button>
        <h1 className="text-xl font-black text-white">Report an Issue</h1>
        {offline && (
          <span className="ml-auto rounded-full bg-amber/20 px-2 py-0.5 text-[10px] text-amber">
            Offline
          </span>
        )}
      </div>

      {step === "capture" && (
        <div className="space-y-4">
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/30 text-center">
            <div>
              <div className="text-4xl">📷</div>
              <p className="mt-2 text-sm text-gray-400">
                Capture a photo — Gemini Vision will auto-detect the issue
              </p>
              <div className="mt-4 flex gap-2 justify-center">
                <button
                  onClick={openFileUpload}
                  disabled={uploading}
                  className="rounded-xl bg-teal px-6 py-2 text-sm font-bold text-midnight hover:bg-teal/90 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "📤 Upload Photo"}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">Pick a quick demo scene:</p>
          <div className="grid grid-cols-2 gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s.img}
                onClick={() => runAnalysis(s.hint, s.img)}
                className="glass flex items-center gap-2 rounded-xl p-3 text-left"
              >
                <span className="text-2xl">{TYPE_ICON[s.img]}</span>
                <span className="text-xs text-gray-300">{TYPE_LABEL[s.img]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "analyzing" && (
        <div className="flex flex-col items-center gap-4 pt-16 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-teal/30 border-t-teal text-3xl"
          >
            🔍
          </motion.div>
          <p className="text-base font-semibold text-teal">Gemini AI is analyzing your photo…</p>
          <p className="text-xs text-gray-500">Extracting issue type, severity & location</p>
        </div>
      )}

      {step === "form" && (
        <div className="space-y-4">
          {imageUrl && (
            <img src={imageUrl} alt="" className="aspect-video w-full rounded-2xl object-cover" />
          )}

          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-teal/30 bg-teal/5 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-teal">
                  AI Detection
                </span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-300">
                  {analysis.source === "gemini" ? "Gemini Vision" : "AI (demo)"} ·{" "}
                  {Math.round(analysis.confidence * 100)}%
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-3xl">{TYPE_ICON[analysis.issue_type]}</span>
                <div>
                  <div className="font-bold text-white">{TYPE_LABEL[analysis.issue_type]}</div>
                  <div className="text-xs text-gray-400">
                    Severity {analysis.severity}/5 · → {analysis.suggested_department}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-300">💡 {analysis.reasoning}</p>
            </motion.div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs text-gray-400">Description</label>
              <button
                onClick={toggleVoice}
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                  listening ? "bg-amber text-midnight" : "glass text-gray-300"
                }`}
              >
                🎤 {listening ? "Listening…" : "Voice"}
              </button>
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Describe the issue (or use voice)…"
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-gray-100 outline-none focus:border-teal"
            />
          </div>

          <div className="glass flex items-center gap-2 rounded-xl p-3 text-xs text-gray-300">
            📍 GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)} · Serilingampalle
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Adjust location (tap map to drop a pin)
            </label>
            <MapView
              height={180}
              pickable
              center={coords}
              issues={[{ ...({} as any), lat: coords.lat, lng: coords.lng, status: "REPORTED" }]}
              onPick={(lat, lng) => setCoords({ lat, lng })}
            />
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full rounded-2xl bg-teal py-4 text-base font-bold text-midnight shadow-glow disabled:opacity-60"
          >
            {submitting ? "Submitting…" : offline ? "Save offline" : "Submit report →"}
          </button>
        </div>
      )}
    </motion.div>
  );
}
