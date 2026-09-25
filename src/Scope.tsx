import { useEffect, useRef } from 'react'
import type { ModuleInst } from './core/patch.ts'
import { TRACE_COLORS, yRange } from './core/scope.ts'
import { live } from './engine.ts'

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d)

/** scope_4ch's screen: its four inputs over the chosen time window, redrawn every animation frame from the engine stream. */
export function Scope({ inst, connected }: { inst: ModuleInst; connected: (port: string) => boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const props = useRef({ inst, connected })
  props.current = { inst, connected }
  useEffect(() => {
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const c = ref.current
      if (!c) return
      const dpr = devicePixelRatio || 1
      const w = c.clientWidth
      const h = c.clientHeight
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr)
        c.height = Math.round(h * dpr)
      }
      const g = c.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const css = getComputedStyle(c)
      g.fillStyle = css.getPropertyValue('--bg') || '#0a0e0d'
      g.fillRect(0, 0, w, h)
      g.strokeStyle = css.getPropertyValue('--line') || '#1e2b28'
      g.lineWidth = 1
      g.beginPath()
      for (let k = 1; k < 4; k++) {
        g.moveTo(Math.round((w * k) / 4) + 0.5, 0)
        g.lineTo(Math.round((w * k) / 4) + 0.5, h)
        g.moveTo(0, Math.round((h * k) / 4) + 0.5)
        g.lineTo(w, Math.round((h * k) / 4) + 0.5)
      }
      g.stroke()
      const { inst, connected } = props.current
      const p = inst.params
      const [lo, hi] = yRange(p.y_range)
      const window = num(p.time_s, 5)
      const step = p.style === 'step'
      g.font = '10px Cascadia Mono, Consolas, monospace'
      let row = 0
      for (let ch = 1; ch <= 4; ch++) {
        const port = `in${ch}`
        const tr = live.traces.get(`${inst.id}:${port}`)
        if (!tr || !tr.size || p[`show${ch}`] === 'off' || !connected(port)) continue
        const color = TRACE_COLORS[String(p[`color${ch}`])] ?? TRACE_COLORS.cyan
        const pts = tr.points(live.simTime, window, lo, hi, w, h, num(p[`gain${ch}`], 1), num(p[`offset${ch}`], 0))
        g.strokeStyle = color
        g.lineWidth = 1.5
        g.beginPath()
        for (let k = 0; k < pts.length; k += 2) {
          if (k === 0) g.moveTo(pts[k], pts[k + 1])
          else if (step) {
            g.lineTo(pts[k], pts[k - 1])
            g.lineTo(pts[k], pts[k + 1])
          } else g.lineTo(pts[k], pts[k + 1])
        }
        g.stroke()
        if (p.readouts !== 'off') {
          g.fillStyle = color
          g.fillText(`${ch} ${(tr.last() ?? 0).toFixed(1)}`, w - 58, 12 + 12 * row++)
        }
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas className="scope-screen" ref={ref} data-scope={inst.id} />
}
