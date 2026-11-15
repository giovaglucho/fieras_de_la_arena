import react from '@vitejs/plugin-react'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const faviconPath = fileURLToPath(new URL('./public/favicon.svg', import.meta.url))

function faviconCompatibilityPlugin() {
  return {
    name: 'favicon-compatibility',
    configureServer(server) {
      server.middlewares.use('/favicon.ico', async (request, response, next) => {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return next()
        }

        try {
          const favicon = await readFile(faviconPath)
          response.statusCode = 200
          response.setHeader('Content-Type', 'image/svg+xml')
          response.setHeader('Cache-Control', 'public, max-age=86400')
          return response.end(request.method === 'HEAD' ? undefined : favicon)
        } catch (error) {
          return next(error)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), faviconCompatibilityPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
