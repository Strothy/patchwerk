// M2 first light: an LFO cabled into a scope, playing, draws its wave. Drives the real app: modules added through the app's
// own actions, one cable dragged with the mouse, and the scope's samples checked against the LFO formula.
import { writeFileSync } from 'node:fs'
import { connect } from './cdp.mjs'
import { until } from './lib.mjs'

const { ev, drag, screenshot, close } = await connect()
const check = (name, ok, detail = '') => console.log(`  ${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`)
const app = 'window.patchwerkApp'

// an LFO at 1 Hz, 50 +- 40, and a scope beside it
await ev(`${app}.actions.add('lfo', 0, 0)`)
await ev(`${app}.actions.add('scope_4ch', 320, 0)`)
await ev(`(() => { const a = ${app}.actions; a.input('lfo_1', 'rate', 1); a.input('lfo_1', 'amp', 40); a.input('lfo_1', 'offset', 50) })()`)
await until(() => ev(`document.querySelectorAll('[data-jack]').length >= 10`), { what: 'both modules on the canvas' })

// cable: drag from the LFO's out jack to the scope's in1 with the mouse
const at = (sel) => ev(`(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })()`)
await drag(await at('[data-jack="lfo_1|out|out"]'), await at('[data-jack="scope_4ch_1|in1|in"]'))
const cabled = await until(() => ev(`${app}.patch().connections.length === 1 && !!document.querySelector('[data-cable="lfo_1.out>scope_4ch_1.in1"]')`), { what: 'the cable', timeoutMs: 3000 }).catch(() => false)
check('a mouse drag from out to in makes a cable', cabled)

await ev(`${app}.actions.transport('play')`)
await until(() => ev(`(${app}.live.traces.get('scope_4ch_1:in1')?.size ?? 0) > 90`), { what: 'scope samples', timeoutMs: 8000 })
const samples = await ev(`${app}.live.traces.get('scope_4ch_1:in1').samples(60)`)
const worst = Math.max(...samples.map(([t, v]) => Math.abs(v - (50 + 40 * Math.sin(2 * Math.PI * t)))))
check('the scope receives the LFO wave (50 + 40 sin 2πt)', worst < 1e-3, `worst error ${worst.toExponential(2)} over ${samples.length} samples`)
const dts = samples.slice(1).map(([t], k) => t - samples[k][0])
check('ticks are a fixed 1/60 s apart', dts.every((d) => Math.abs(d - 1 / 60) < 1e-9))

// the scope actually draws: channel 1's colour on its screen
await new Promise((r) => setTimeout(r, 300))
const lit = await ev(`(() => { const c = document.querySelector('[data-scope="scope_4ch_1"]'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 2] > 200 && d[i] < 140) n++; return n })()`)
check('the scope screen shows the trace', lit > 200, `${lit} trace pixels`)
writeFileSync(new URL('./first-light.png', import.meta.url), await screenshot())

// stop: paused and back to 0
await ev(`${app}.actions.transport('stop')`)
const stopped = await until(() => ev(`!${app}.live.playing`), { what: 'stop', timeoutMs: 2000 }).catch(() => false)
check('stop pauses the engine', stopped)
await close()
