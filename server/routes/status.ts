import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('device_status').select('*').eq('id', 1).single()
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { status, servo_angle, mode } = req.body
  if (!status || servo_angle === undefined || !mode) {
    res.status(400).json({ error: 'status, servo_angle, and mode are required' }); return
  }
  const { data, error } = await supabase
    .from('device_status')
    .upsert({ id: 1, status, servo_angle: Number(servo_angle), mode, updated_at: new Date().toISOString() })
    .select().single()
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

export default router
