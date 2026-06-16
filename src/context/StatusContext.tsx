import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Status } from "../types";

export const SENSOR_COOLDOWN_MS = 30_000;

interface StatusContextValue {
  status: Status | null;
  error: string | null;
  cooldownMs: number;
  inCooldown: boolean;
  cooldownSec: number;
}

const StatusContext = createContext<StatusContextValue>({
  status: null,
  error: null,
  cooldownMs: 0,
  inCooldown: false,
  cooldownSec: 0,
});

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const s = await api.getStatus();
        if (!cancelled) { setStatus(s); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "error");
      }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (!status?.updated_at) return;
    function tick() {
      const elapsed = Date.now() - new Date(status!.updated_at).getTime();
      setCooldownMs(Math.max(0, SENSOR_COOLDOWN_MS - elapsed));
    }
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [status?.updated_at]);

  return (
    <StatusContext.Provider value={{
      status,
      error,
      cooldownMs,
      inCooldown: cooldownMs > 0,
      cooldownSec: Math.ceil(cooldownMs / 1000),
    }}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  return useContext(StatusContext);
}
