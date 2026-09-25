// Minimal CDP helper for driving the running Patchwerk window (started with `npm run tauri dev -- --config tauri.devtools.json`,
// or Patchwerk Dev.cmd). The suites drive the app through window.patchwerkApp (dev builds only), never a mock of it.
export async function connect() {
  const pages = await (await fetch('http://127.0.0.1:9223/json')).json()
  const page = pages.find((p) => p.type === 'page' && p.url.includes('5183'))
  if (!page) throw new Error('No Patchwerk window on the debugging port 9223: start it with Patchwerk Dev.cmd')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const wait = new Map()
  ws.onmessage = (e) => { const m = JSON.parse(e.data); wait.get(m.id)?.(m) }
  const send = (method, params) => new Promise((r) => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (expression) => { const m = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description ?? JSON.stringify(m.result.exceptionDetails)); return m.result?.result?.value }
  const ready = () => ev(`(async () => { for (let i = 0; i < 200 && !(window.patchwerkApp && window.patchwerkApp.manifests().size); i++) await new Promise((r) => setTimeout(r, 50)) })()`)
  await ready()
  /** A real mouse drag (pointer events and all) from one point to another, in page pixels. */
  const drag = async (from, to, steps = 8) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 })
    for (let k = 1; k <= steps; k++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x + ((to.x - from.x) * k) / steps, y: from.y + ((to.y - from.y) * k) / steps, button: 'left', buttons: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1 })
  }
  /** A PNG of the window, for a human (or an agent) to look at. */
  const screenshot = async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64')
  // Every suite leaves a fresh page (an empty patch, which the engine loads too) for the next.
  const close = async () => {
    try {
      await ev(`window.patchwerkApp?.actions.transport('stop')`)
      await send('Page.reload', {})
      await new Promise((r) => setTimeout(r, 500))
    } catch {
      // the page may be gone; nothing to reset then
    }
    ws.close()
  }
  for (const e of ['uncaughtException', 'unhandledRejection']) process.on(e, async (err) => { console.error(err); await close(); process.exit(1) })
  return { ev, send, drag, screenshot, close, ready }
}
