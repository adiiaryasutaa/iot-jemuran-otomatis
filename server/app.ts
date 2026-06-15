import express from 'express'
import cors from 'cors'
import router from './routes'
import { authMiddleware } from './middleware/auth'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => { res.json({ ok: true }) })
app.use('/api', authMiddleware, router)

if (!process.env.VERCEL) {
  const port = process.env.PORT ?? 3000
  app.listen(port, () => console.log(`API running on http://localhost:${port}`))
}

export default app
