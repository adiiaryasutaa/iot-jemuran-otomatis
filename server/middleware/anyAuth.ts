import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";
import { supabase } from "../lib/supabase";

function safeCompare(received: string, expected: string): boolean {
  const r = Buffer.from(received, "utf8");
  const e = Buffer.from(expected, "utf8");
  if (r.length !== e.length) return false;
  return timingSafeEqual(r, e);
}

// Accepts either device key (x-api-key) or user JWT (Authorization: Bearer)
// Used on endpoints shared by ESP32 and browser (e.g. GET /api/config)
export async function anyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const deviceKey = req.headers["x-api-key"] as string | undefined;
  const expected = process.env.DEVICE_API_KEY;

  if (deviceKey !== undefined) {
    if (expected && safeCompare(deviceKey, expected)) {
      next();
      return;
    }
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(auth.slice(7));
  if (error || !user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
