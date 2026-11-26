// Captures store phone screenshots from the running dev server with headless Edge.
// Default is 1080x1920 for Play. For the App Store's 6.7-inch slot (1290x2796) set SHOT_WIDTH=430 SHOT_HEIGHT=932.
// The result screens use MediaPipe's canonical face model as a stand-in, so no real person's photo is needed.
// Usage: node scripts/store-screenshots.mjs <dev server url> <canonical_face_model.obj> <output dir>
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [site, modelPath, out] = process.argv.slice(2)
const browser = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const port = 9333
const width = Number(process.env.SHOT_WIDTH || 360), height = Number(process.env.SHOT_HEIGHT || 640)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Project the model as a camera 45 cm away would see it, then make the face a little distinctive.
const vertices = readFileSync(modelPath, 'utf8').split('\n').filter(line => line.startsWith('v '))
  .map(line => line.split(/\s+/).slice(1).map(Number))
const points = vertices.map(([x, y, z]) => {
  const k = 45 / (45 - z + 7.5)
  return { x: x * k / 30 + .5, y: -y * k / 30 + .5, z: -z / 30 }
})
const toward = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z })
points[98] = toward(points[98], points[2], -.3)
points[327] = toward(points[327], points[2], -.3)
points[0] = toward(points[0], points[13], -.45)
points[17] = toward(points[17], points[14], -.45)
points[70] = { ...points[70], y: points[70].y - .01 }
points[300] = { ...points[300], y: points[300].y - .01 }

const profile = mkdtempSync(join(tmpdir(), 'store-shots-'))
const child = spawn(browser, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' })
try {
  let target
  for (let attempt = 0; attempt < 40 && !target; attempt++) {
    await sleep(250)
    target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json()).catch(() => null)
  }
  if (!target) throw new Error('The browser did not start.')
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let id = 0
  const pending = new Map()
  socket.onmessage = event => {
    const message = JSON.parse(event.data)
    if (!pending.has(message.id)) return
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    message.error ? reject(new Error(message.error.message)) : resolve(message.result)
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
  const run = async expression => {
    const result = await send('Runtime.evaluate', { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'page script failed')
    return result.result.value
  }
  const shot = async name => {
    await sleep(400)
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(out, name), Buffer.from(data, 'base64'))
    console.log('saved', name)
  }

  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 3, mobile: true })
  await send('Page.navigate', { url: `${site}#/` })
  await sleep(2500)
  await shot('phone-1-home.png')

  await run(`
    const points = ${JSON.stringify(points)}
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 900
    const context = canvas.getContext('2d')
    const glow = context.createRadialGradient(450, 430, 60, 450, 450, 640)
    glow.addColorStop(0, '#3d5a66'); glow.addColorStop(1, '#101a26')
    context.fillStyle = glow
    context.fillRect(0, 0, 900, 900)
    const { session } = await import('/src/stores/session.js')
    session.image = canvas.toDataURL('image/jpeg', .9)
    session.imageAspect = 1
    session.landmarks = [points]
    location.hash = '#/analysis'
  `)
  await sleep(2200)
  await shot('phone-2-analysis.png')
  await sleep(3500)
  if (await run('return location.hash') !== '#/result') throw new Error('The result screen did not open.')
  await run(`window.scrollTo(0, 0)`)
  await shot('phone-3-result.png')
  await run(`document.querySelector('.result-highlights').scrollIntoView({ block: 'start' }); window.scrollBy(0, -52)`)
  await shot('phone-4-scores.png')
  await run(`document.querySelector('.fortune-cards').scrollIntoView({ block: 'start' }); window.scrollBy(0, -16)`)
  await shot('phone-5-fortune.png')
  await run(`document.querySelector('.readings-title').scrollIntoView({ block: 'start' }); window.scrollBy(0, -16)`)
  await shot('phone-6-readings.png')
  await run(`const more = document.querySelector('.additional-scores'); more.open = true; more.scrollIntoView({ block: 'start' }); window.scrollBy(0, -16)`)
  await shot('phone-7-more-scores.png')
  socket.close()
} finally {
  child.kill()
  await sleep(500)
  // The browser can still hold a file for a moment. A leftover temp profile is harmless.
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5 }) } catch {}
}
