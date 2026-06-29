import { useEffect, useRef, useState } from "react";

export interface WsMessage {
  event: string;
  payload: any;
  ts: string;
}

/** Subscribe to live backend updates (Req 9). */
export function useWebSocket(onMessage?: (m: WsMessage) => void) {
  const [connected, setConnected] = useState(false);
  const [last, setLast] = useState<WsMessage | null>(null);
  const ref = useRef<WebSocket | null>(null);

  useEffect(() => {
    let wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl) {
      try {
        const url = new URL(backendUrl);
        const proto = url.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${proto}//${url.host}/ws`;
      } catch { /* ignore */ }
    }
    const ws = new WebSocket(wsUrl);
    ref.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        setLast(msg);
        onMessage?.(msg);
      } catch {
        /* ignore */
      }
    };
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 25000);
    return () => {
      clearInterval(ping);
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { connected, last };
}
