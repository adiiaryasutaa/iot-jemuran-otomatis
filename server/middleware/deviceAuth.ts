import type { Request, Response, NextFunction } from 'express'
import { timingSafeEqual } from 'crypto'

function safeCompare(received: string, expected: string): boolean {
  const r = Buffer.from(received, 'utf8')
  const e = Buffer.from(expected, 'utf8')
  if (r.length !== e.length) return false
  return timingSafeEqual(r, e)
}

export function deviceAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key'] as string | undefined
  const expected = process.env.DEVICE_API_KEY
  if (!key || !expected || !safeCompare(key, expected)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}
