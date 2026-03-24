import { useCallback, useEffect, useRef, useState } from "react";

export interface TapEvent {
  id: number;
  pad: number;
  timestamp: number;
}

export interface UseTouchDesignerOptions {
  url?: string;
  onTap?: (pad: number) => void;
}

export interface UseTouchDesignerReturn {
  isConnected: boolean;
  error: string | null;
  taps: TapEvent[];
  clearTaps: () => void;
}

const RECONNECT_INTERVAL = 3000;

export function useTouchDesigner(
  options: UseTouchDesignerOptions = {}
): UseTouchDesignerReturn {
  const { url = "ws://localhost:9980", onTap } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taps, setTaps] = useState<TapEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const tapIdRef = useRef(0);
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addTap = useCallback((pad: number) => {
    tapIdRef.current += 1;
    setTaps((prev) => [
      { id: tapIdRef.current, pad, timestamp: Date.now() },
      ...prev.slice(0, 99),
    ]);
    onTapRef.current?.(pad);
  }, []);

  useEffect(() => {
    let alive = true;

    function connectWs() {
      if (!alive) return;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        if (!alive) { ws.close(); return; }
        setIsConnected(true);
        setError(null);
      });

      ws.addEventListener("message", (event) => {
        const raw = typeof event.data === "string" ? event.data : "";
        // TouchDesigner sends lines like "TAP:0" or JSON like {"type":"tap","pad":0}
        for (const line of raw.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Plain text format: TAP:0
          if (trimmed.startsWith("TAP:")) {
            const pad = parseInt(trimmed.split(":")[1], 10);
            if (!Number.isNaN(pad)) addTap(pad);
            continue;
          }

          // JSON format: {"type":"tap","pad":0}
          try {
            const msg = JSON.parse(trimmed);
            if (msg.type === "tap" && typeof msg.pad === "number") {
              addTap(msg.pad);
            }
          } catch {
            // Not JSON, ignore
          }
        }
      });

      ws.addEventListener("close", () => {
        setIsConnected(false);
        wsRef.current = null;
        if (alive) {
          reconnectTimer.current = setTimeout(connectWs, RECONNECT_INTERVAL);
        }
      });

      ws.addEventListener("error", () => {
        setError("Cannot reach TouchDesigner — is it running on " + url + "?");
        ws.close();
      });
    }

    connectWs();

    return () => {
      alive = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [url, addTap]);

  const clearTaps = useCallback(() => {
    setTaps([]);
    tapIdRef.current = 0;
  }, []);

  return { isConnected, error, taps, clearTaps };
}
