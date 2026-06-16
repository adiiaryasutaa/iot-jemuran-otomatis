import type { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";

// Rejects a manual command when the unified cooldown is still active.
// Cooldown window = device_config.cooldown_ms, measured from the most recent
// of: last device state change (device_status.updated_at) or last manual command.
export async function cooldownGuard(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const [{ data: config }, { data: status }, { data: lastCmd }] = await Promise.all([
    supabase.from("device_config").select("cooldown_ms").eq("id", 1).single(),
    supabase.from("device_status").select("updated_at").eq("id", 1).single(),
    supabase
      .from("commands")
      .select("created_at")
      .eq("source", "manual")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const cooldownMs = config?.cooldown_ms ?? 30_000;
  const lastChangeMs = Math.max(
    status?.updated_at ? new Date(status.updated_at).getTime() : 0,
    lastCmd?.created_at ? new Date(lastCmd.created_at).getTime() : 0,
  );
  const remaining = lastChangeMs + cooldownMs - Date.now();

  if (remaining > 0) {
    res.status(429).json({
      error: `Cooldown aktif, tunggu ${Math.ceil(remaining / 1000)} detik`,
      remaining_ms: remaining,
    });
    return;
  }
  next();
}
