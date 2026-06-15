import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { command } = req.body
  if (!['open', 'close'].includes(command)) {
    res.status(400).json({ error: 'command must be "open" or "close"' }); return
  }
  const { data, error } = await supabase
    .from('commands').insert({ command, source: 'manual' }).select().single()
  if (error) { res.status(500).json({ error: error.message }); return }
  res.status(201).json(data)
})

router.get('/pending', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('commands').select('*').eq('is_executed', false)
    .order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

router.patch('/:id/executed', async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return }
  const { data, error } = await supabase
    .from('commands').update({ is_executed: true }).eq('id', id).select().single()
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
})

export default router
