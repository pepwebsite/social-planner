import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// In sviluppo serve /api/ai con lo stesso handler usato in produzione (Vercel).
function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const mod = await server.ssrLoadModule('/api/ai.ts')
        const body: unknown = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null
        const { status, json } = await mod.handleAiRequest(req.method ?? 'GET', body)
        res.statusCode = status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(json))
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return { plugins: [react(), tailwindcss(), devApi()] }
})
