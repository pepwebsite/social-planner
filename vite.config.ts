import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// In sviluppo serve le funzioni in /api (stessi file usati in produzione su Vercel)
function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const match = /^\/api\/([a-z-]+)\/?$/.exec(url.pathname)
        if (!match) return next()
        let mod: Record<string, unknown>
        try {
          mod = await server.ssrLoadModule(`/api/${match[1]}.ts`)
        } catch {
          return next()
        }
        const method = req.method ?? 'GET'
        const handler = mod[method] as ((r: Request) => Promise<Response>) | undefined
        if (!handler) {
          res.statusCode = 405
          return res.end()
        }
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const request = new Request(`http://${req.headers.host}${req.url}`, {
          method,
          headers: req.headers as Record<string, string>,
          body: chunks.length && method !== 'GET' ? Buffer.concat(chunks) : undefined,
        })
        const response = await handler(request)
        res.statusCode = response.status
        response.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(Buffer.from(await response.arrayBuffer()))
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return { plugins: [react(), tailwindcss(), devApi()] }
})
