import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { userAuth } from '../middleware/userAuth'
import { deviceAuth } from '../middleware/deviceAuth'

const router = Router()

// Browser reads logs
router.get('/', userAuth, async (req: Request, res: Response): Promise<void> => {
  const page  = Math.max(1, Number(req.query.page)  || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30))
  const from  = (page - 1) * limit
  const to    = from + limit - 1

  const { count, error: countErr } = await supabase
    .from('event_logs').select('*', { count: 'exact', head: true })
  if (countErr) { res.status(500).json({ error: countErr.message }); return }

  const { data, error } = await supabase
    .from('event_logs').select('*')
    .order('created_at', { ascending: false }).range(from, to)
  if (error) { res.status(500).json({ error: error.message }); return }

  const total = count ?? 0
  res.json({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } })
})

// ESP32 appends log entries
router.post('/', deviceAuth, async (req: Request, res: Response): Promise<void> => {
  const { status, servo_angle, source } = req.body
  if (!['hujan', 'cerah'].includes(status)) {
    res.status(400).json({ error: 'status must be "hujan" or "cerah"' }); return
  }
  if (!['sensor', 'manual', 'schedule'].includes(source)) {
    res.status(400).json({ error: 'source must be "sensor", "manual", or "schedule"' }); return
  }
  if (servo_angle === undefined) {
    res.status(400).json({ error: 'servo_angle is required' }); return
  }
  const { data, error } = await supabase
    .from('event_logs').insert({ status, servo_angle: Number(servo_angle), source }).select().single()
  if (error) { res.status(500).json({ error: error.message }); return }
  res.status(201).json(data)
})

export default router
