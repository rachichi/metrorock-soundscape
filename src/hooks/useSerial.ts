import { useCallback, useEffect, useRef, useState } from "react";

export interface TapEvent {
  id: number;
  pad: number;
  timestamp: number;
}

export interface UseSerialOptions {
  baudRate?: number;
  onTap?: (pad: number) => void;
}

export interface UseSerialReturn {
  isConnected: boolean;
  isSupported: boolean;
  error: string | null;
  taps: TapEvent[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearTaps: () => void;
}

export function useSerial(options: UseSerialOptions = {}): UseSerialReturn {
  const { baudRate = 9600, onTap } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taps, setTaps] = useState<TapEvent[]>([]);

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tapIdRef = useRef(0);
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  const isSupported = typeof navigator !== "undefined" && "serial" in navigator;

  const readLoop = useCallback(async (port: SerialPort) => {
    const decoder = new TextDecoder();
    let buffer = "";

    if (!port.readable) return;

    const reader = port.readable.getReader();
    readerRef.current = reader;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("TAP:")) {
            const pad = parseInt(trimmed.split(":")[1], 10);
            if (!Number.isNaN(pad)) {
              tapIdRef.current += 1;
              setTaps((prev) => [
                { id: tapIdRef.current, pad, timestamp: Date.now() },
                ...prev.slice(0, 99),
              ]);
              onTapRef.current?.(pad);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Read error";
      setError(msg);
    } finally {
      reader.releaseLock();
      readerRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!isSupported) {
      setError("Web Serial API is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    try {
      setError(null);
      const port = await navigator.serial.requestPort();

      // Brief pause helps if the port was just released by another app
      await new Promise((r) => setTimeout(r, 300));

      await port.open({ baudRate });

      portRef.current = port;
      abortRef.current = new AbortController();
      setIsConnected(true);

      readLoop(port);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotFoundError") return;

      let msg = err instanceof Error ? err.message : "Connection failed";
      if (msg.includes("Failed to open serial port")) {
        msg =
          "Port is busy — close Arduino IDE Serial Monitor or any other app using this port, then try again.";
      }
      setError(msg);
    }
  }, [isSupported, baudRate, readLoop]);

  const disconnect = useCallback(async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
      abortRef.current = null;
      setIsConnected(false);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Disconnect failed";
      setError(msg);
    }
  }, []);

  const clearTaps = useCallback(() => {
    setTaps([]);
    tapIdRef.current = 0;
  }, []);

  // Auto-reconnect to a previously paired port on mount / HMR reload
  useEffect(() => {
    if (!isSupported) return;
    let cancelled = false;

    async function tryReconnect() {
      const ports = await navigator.serial.getPorts();
      if (cancelled || ports.length === 0) return;

      const port = ports[0];
      try {
        await port.open({ baudRate });
      } catch {
        // Port may already be open from a previous session — that's fine
        if (!port.readable) return;
      }

      if (cancelled) return;

      portRef.current = port;
      abortRef.current = new AbortController();
      setIsConnected(true);
      readLoop(port);
    }

    tryReconnect();

    return () => {
      cancelled = true;
    };
  }, [isSupported, baudRate, readLoop]);

  // Clean up port on unmount so HMR doesn't leave a dangling connection
  useEffect(() => {
    return () => {
      const reader = readerRef.current;
      const port = portRef.current;
      if (reader) {
        reader.cancel().catch(() => {});
      }
      if (port) {
        port.close().catch(() => {});
      }
    };
  }, []);

  return { isConnected, isSupported, error, taps, connect, disconnect, clearTaps };
}
