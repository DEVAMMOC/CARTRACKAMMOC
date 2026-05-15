import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { veiculosRouter } from './routes/veiculos'
import { reservasRouter } from './routes/reservas'
import { disponibilidadeRouter } from './routes/disponibilidade'
import { relatoriosRouter } from './routes/relatorios'
import { initCron } from './services/cron'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:3000' }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/veiculos', veiculosRouter)
app.use('/reservas', reservasRouter)
app.use('/disponibilidade', disponibilidadeRouter)
app.use('/relatorios', relatoriosRouter)

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`)
  initCron()
})

export { app }
