import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { userAuth } from '../middleware/userAuth'

const router = Router()

router.get('/', userAuth, async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('schedules').select('*')
    .order('hour', { ascending: true }).order('minute', { ascending: true })
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

router.post('/', userAuth, async (req: Request, res: Response): Promise<void> => {
  const { label, action, hour, minute, days = [], is_active = true } = req.body
  if (!label || !action || hour === undefined || minute === undefined) {
    res.status(400).json({ error: 'label, action, hour, and minute are required' }); return
  }
  if (!['open', 'close'].includes(action)) {
    res.status(400).json({ error: 'action must be "open" or "close"' }); return
  }
  const { data, error } = await supabase
    .from('schedules')
    .insert({ label, action, hour: Number(hour), minute: Number(minute), days, is_active })
    .select().single()
  if (error) { res.status(500).json({ error: error.message }); return }
  res.status(201).json(data)
})

router.put('/:id', userAuth, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return }
  const { label, action, hour, minute, days, is_active } = req.body
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (label     !== undefined) updates.label     = label
  if (action    !== undefined) updates.action    = action
  if (hour      !== undefined) updates.hour      = Number(hour)
  if (minute    !== undefined) updates.minute    = Number(minute)
  if (days      !== undefined) updates.days      = days
  if (is_active !== undefined) updates.is_active = is_active
  const { data, error } = await supabase
    .from('schedules').update(updates).eq('id', id).select().single()
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

router.delete('/:id', userAuth, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return }
  const { error } = await supabase.from('schedules').delete().eq('id', id)
  if (error) { res.status(500).json({ error: error.message }); return }
  res.status(204).send()
})

router.patch('/:id/toggle', userAuth, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return }
  const { data: current, error: fetchErr } = await supabase
    .from('schedules').select('is_active').eq('id', id).single()
  if (fetchErr) { res.status(500).json({ error: fetchErr.message }); return }
  const { data, error } = await supabase
    .from('schedules')
    .update({ is_active: !current.is_active, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

export default router
