import type { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";

export async function userAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
