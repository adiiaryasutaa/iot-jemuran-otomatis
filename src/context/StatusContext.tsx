import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Status } from "../types";

export const DEFAULT_COOLDOWN_MS = 30_000;

interface StatusContextValue {
  status: Status | null;
  error: string | null;
  cooldownMs: number;
  inCooldown: boolean;
  cooldownSec: number;
  markAction: () => void;
  mode: "auto" | "manual";
  setMode: (mode: "auto" | "manual") => Promise<void>;
}

const StatusContext = createContext<StatusContextValue>({
  status: null,
  error: null,
  cooldownMs: 0,
  inCooldown: false,
  cooldownSec: 0,
  markAction: () => {},
  mode: "auto",
  setMode: async () => {},
});

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldownDurationMs, setCooldownDurationMs] = useState(DEFAULT_COOLDOWN_MS);
  const [mode, setModeState] = useState<"auto" | "manual">("auto");
  const [lastActionMs, setLastActionMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Poll device status every 3s.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const s = await api.getStatus();
        if (!cancelled) {
          setStatus(s);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "error");
      }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Fetch cooldown duration from config (rarely changes) on mount + every 60s.
  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      try {
        const cfg = await api.getConfig();
        if (!cancelled) {
          setCooldownDurationMs(cfg.cooldown_ms);
          setModeState(cfg.mode);
        }
      } catch {
        /* keep current/default */
      }
    }
    loadConfig();
    const id = setInterval(loadConfig, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Tick a clock so the cooldown countdown stays live.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // Unified cooldown: counts from the most recent of a device state change or a
  // locally-fired manual action.
  const baseMs = Math.max(
    status?.updated_at ? new Date(status.updated_at).getTime() : 0,
    lastActionMs,
  );
  const cooldownMs = baseMs > 0 ? Math.max(0, baseMs + cooldownDurationMs - nowMs) : 0;

  // Called by the UI right after firing a manual command so the cooldown starts
  // immediately, without waiting for the device to report back.
  const markAction = useCallback(() => setLastActionMs(Date.now()), []);

  // Optimistically switch mode, then persist via config. The device picks it up
  // on its next config poll.
  const setMode = useCallback(async (next: "auto" | "manual") => {
    setModeState(next);
    try {
      await api.putConfig({ mode: next });
    } catch {
      /* revert on failure */
      try {
        const cfg = await api.getConfig();
        setModeState(cfg.mode);
      } catch {
        /* ignore */
      }
    }
  }, []);

  return (
    <StatusContext.Provider
      value={{
        status,
        error,
        cooldownMs,
        inCooldown: cooldownMs > 0,
        cooldownSec: Math.ceil(cooldownMs / 1000),
        markAction,
        mode,
        setMode,
      }}
    >
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  return useContext(StatusContext);
}
