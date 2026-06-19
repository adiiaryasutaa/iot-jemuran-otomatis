import { Router } from "express";
import type { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { userAuth } from "../middleware/userAuth";
import { deviceAuth } from "../middleware/deviceAuth";

const router = Router();

// Browser reads logs
router.get("/", userAuth, async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const source = req.query.source as string | undefined;
  const dateFrom = req.query.date_from as string | undefined;
  const dateTo = req.query.date_to as string | undefined;

  let countQuery = supabase.from("event_logs").select("*", { count: "exact", head: true });
  if (source === "sensor" || source === "manual" || source === "schedule")
    countQuery = countQuery.eq("source", source);
  if (dateFrom) countQuery = countQuery.gte("created_at", dateFrom);
  if (dateTo) countQuery = countQuery.lte("created_at", dateTo);

  const { count, error: countErr } = await countQuery;
  if (countErr) {
    res.status(500).json({ error: countErr.message });
    return;
  }

  let query = supabase
    .from("event_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (source === "sensor" || source === "manual" || source === "schedule")
    query = query.eq("source", source);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const total = count ?? 0;
  res.json({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// ESP32 appends log entries (legacy `status` field in body is ignored)
router.post("/", deviceAuth, async (req: Request, res: Response): Promise<void> => {
  const { servo_angle, source } = req.body;
  if (!["sensor", "manual", "schedule"].includes(source)) {
    res.status(400).json({ error: 'source must be "sensor", "manual", or "schedule"' });
    return;
  }
  if (servo_angle === undefined) {
    res.status(400).json({ error: "servo_angle is required" });
    return;
  }
  const { data, error } = await supabase
    .from("event_logs")
    .insert({ servo_angle: Number(servo_angle), source })
    .select()
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

export default router;
