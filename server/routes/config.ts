import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { anyAuth } from '../middleware/anyAuth'
import { userAuth } from '../middleware/userAuth'

const router = Router()

// Both ESP32 (device key) and browser (JWT) fetch config
router.get('/', anyAuth, async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('device_config').select('*').eq('id', 1).single()
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

// Only browser updates config
router.put('/', userAuth, async (req: Request, res: Response): Promise<void> => {
  const { angle_open, angle_closed, debounce_ms, rain_active, led_mode, led_blink_ms } = req.body
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (angle_open   !== undefined) updates.angle_open   = Number(angle_open)
  if (angle_closed !== undefined) updates.angle_closed = Number(angle_closed)
  if (debounce_ms  !== undefined) updates.debounce_ms  = Number(debounce_ms)
  if (rain_active  !== undefined) {
    if (!['LOW', 'HIGH'].includes(rain_active)) {
      res.status(400).json({ error: 'rain_active must be "LOW" or "HIGH"' }); return
    }
    updates.rain_active = rain_active
  }
  if (led_mode !== undefined) {
    if (!['solid', 'blink'].includes(led_mode)) {
      res.status(400).json({ error: 'led_mode must be "solid" or "blink"' }); return
    }
    updates.led_mode = led_mode
  }
  if (led_blink_ms !== undefined) {
    const ms = Number(led_blink_ms)
    if (ms < 100 || ms > 5000) {
      res.status(400).json({ error: 'led_blink_ms must be 100–5000' }); return
    }
    updates.led_blink_ms = ms
  }

  const { data, error } = await supabase
    .from('device_config').update(updates).eq('id', 1).select().single()
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

export default router
