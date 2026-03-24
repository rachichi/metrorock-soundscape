import { useCallback, useRef, useState } from "react";

export interface TapEvent {
  id: number;
  pad: number;
  timestamp: number;
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

export function useSerial(baudRate = 9600): UseSerialReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taps, setTaps] = useState<TapEvent[]>([]);

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tapIdRef = useRef(0);

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
      await port.open({ baudRate });

      portRef.current = port;
      abortRef.current = new AbortController();
      setIsConnected(true);

      readLoop(port);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotFoundError") return;
      const msg = err instanceof Error ? err.message : "Connection failed";
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

  return { isConnected, isSupported, error, taps, connect, disconnect, clearTaps };
}
