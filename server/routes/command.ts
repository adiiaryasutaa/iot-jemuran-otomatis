import { Router } from "express";
import type { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { userAuth } from "../middleware/userAuth";
import { deviceAuth } from "../middleware/deviceAuth";
import { cooldownGuard } from "../middleware/cooldownGuard";

const router = Router();

// Browser sends manual command
router.post("/", userAuth, cooldownGuard, async (req: Request, res: Response): Promise<void> => {
  const { command } = req.body;
  if (!["open", "close"].includes(command)) {
    res.status(400).json({ error: 'command must be "open" or "close"' });
    return;
  }
  const { data, error } = await supabase
    .from("commands")
    .insert({ command, source: "manual" })
    .select()
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

// ESP32 polls pending command — ignore commands older than 30s to discard stale queue
router.get("/pending", deviceAuth, async (_req: Request, res: Response): Promise<void> => {
  const cutoff = new Date(Date.now() - 30_000).toISOString();
  const { data, error } = await supabase
    .from("commands")
    .select("*")
    .eq("is_executed", false)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// ESP32 marks command executed
router.patch("/:id/executed", deviceAuth, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const { data, error } = await supabase
    .from("commands")
    .update({ is_executed: true })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

export default router;
