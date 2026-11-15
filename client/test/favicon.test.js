import assert from 'node:assert/strict'
import { createServer as createHttpServer } from 'node:http'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'

const clientRoot = fileURLToPath(new URL('../', import.meta.url))

test('sirve un favicon válido en la ruta heredada /favicon.ico', async (context) => {
  const vite = await createViteServer({
    root: clientRoot,
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
  })
  const server = createHttpServer(vite.middlewares)
  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
    await vite.close()
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  const response = await fetch(`http://127.0.0.1:${server.address().port}/favicon.ico`)
  const body = await response.text()

  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /image\/svg\+xml/)
  assert.match(body, /<svg\b/)
  assert.match(body, /Fieras|#9b5638/i)
})
