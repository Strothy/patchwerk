import { useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type { Connection, Manifest, Patch } from './core/patch.ts'
import { ModuleView } from './ModuleView.tsx'

export type View = { x: number; y: number; zoom: number }
type End = { module: string; port: string; dir: 'in' | 'out' }
type Drag = { kind: 'pan'; sx: number; sy: number; vx: number; vy: number } | { kind: 'move'; id: string; sx: number; sy: number; ox: number; oy: number } | { kind: 'wire'; from: End }

type Props = {
  patch: Patch
  manifests: Map<string, Manifest>
  view: View
  setView: (v: View) => void
  onMove: (id: string, x: number, y: number) => void
  onConnect: (src: string, srcPort: string, dst: string, dstPort: string) => void
  onDisconnect: (match: (c: Connection) => boolean) => void
  onRemove: (id: string) => void
  onInput: (id: string, key: string, value: number) => void
  onParam: (id: string, key: string, value: unknown) => void
}

const KIND_COLOR: Record<string, string> = { signal: 'var(--accent)', gate: 'var(--warn)', trigger: 'var(--danger)' }

function cablePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const sag = Math.min(120, 30 + Math.hypot(b.x - a.x, b.y - a.y) * 0.25) // a little gravity on every cable
  return `M ${a.x} ${a.y} C ${a.x + 30} ${a.y + sag}, ${b.x - 30} ${b.y + sag}, ${b.x} ${b.y}`
}

const parseJack = (el: Element | null): End | null => {
  const j = el?.closest<HTMLElement>('[data-jack]')?.dataset.jack
  if (!j) return null
  const [module, port, dir] = j.split('|')
  return { module, port, dir: dir as 'in' | 'out' }
}

/** The patching surface: pan (drag the background), zoom (wheel, around the mouse), modules, cables between jacks. */
export function Canvas(props: Props) {
  const { patch, manifests, view, setView, onMove, onConnect, onDisconnect } = props
  const box = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const [jacks, setJacks] = useState(new Map<string, { x: number; y: number }>())
  const [wire, setWire] = useState<{ from: End; x: number; y: number } | null>(null)

  // Jack centres in canvas coordinates, measured after each layout change (modules moved, added, zoomed).
  // ponytail: measures every jack on every patch change; per-module measurement if big patches make drags stutter (M5 perf gate)
  useLayoutEffect(() => {
    const l = layer.current
    if (!l) return
    const lr = l.getBoundingClientRect()
    const m = new Map<string, { x: number; y: number }>()
    for (const el of l.querySelectorAll<HTMLElement>('[data-jack]')) {
      const r = el.getBoundingClientRect()
      m.set(el.dataset.jack!, { x: (r.left + r.width / 2 - lr.left) / view.zoom, y: (r.top + r.height / 2 - lr.top) / view.zoom })
    }
    setJacks(m)
  }, [patch, view.zoom, manifests])

  const toCanvas = (clientX: number, clientY: number) => {
    const r = box.current!.getBoundingClientRect()
    return { x: (clientX - r.left - view.x) / view.zoom, y: (clientY - r.top - view.y) / view.zoom }
  }
  const capture = (e: RPointerEvent) => box.current?.setPointerCapture(e.pointerId)

  const onJackDown = (e: RPointerEvent, module: string, port: string, dir: 'in' | 'out') => {
    if (e.button !== 0) return
    e.stopPropagation()
    capture(e)
    drag.current = { kind: 'wire', from: { module, port, dir } }
    setWire({ from: { module, port, dir }, ...toCanvas(e.clientX, e.clientY) })
  }
  const onGrab = (e: RPointerEvent, id: string) => {
    if (e.button !== 0) return
    e.stopPropagation()
    capture(e)
    const m = patch.modules.find((q) => q.id === id)!
    drag.current = { kind: 'move', id, sx: e.clientX, sy: e.clientY, ox: m.ui.x ?? 0, oy: m.ui.y ?? 0 }
  }

  const connected = (id: string) => (port: string) => patch.connections.some((c) => c.dst_module === id && c.dst_port === port)
  const outKind = (c: Connection) => manifests.get(patch.modules.find((m) => m.id === c.src_module)?.type ?? '')?.output_ports.find((p) => p.name === c.src_port)?.signal_kind ?? 'signal'

  return (
    <div
      className="canvas"
      ref={box}
      style={{ backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
      onPointerDown={(e) => {
        if (e.button !== 0 && e.button !== 1) return
        capture(e)
        drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        if (d.kind === 'pan') setView({ ...view, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy })
        else if (d.kind === 'move') onMove(d.id, d.ox + (e.clientX - d.sx) / view.zoom, d.oy + (e.clientY - d.sy) / view.zoom)
        else setWire({ from: d.from, ...toCanvas(e.clientX, e.clientY) })
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (d?.kind !== 'wire') return
        setWire(null)
        const to = parseJack(document.elementFromPoint(e.clientX, e.clientY))
        if (!to || to.dir === d.from.dir) return
        const [out, inp] = d.from.dir === 'out' ? [d.from, to] : [to, d.from]
        onConnect(out.module, out.port, inp.module, inp.port)
      }}
      onWheel={(e) => {
        const r = box.current!.getBoundingClientRect()
        const cx = e.clientX - r.left
        const cy = e.clientY - r.top
        const zoom = Math.min(2.5, Math.max(0.2, view.zoom * Math.exp(-e.deltaY * 0.0015)))
        setView({ zoom, x: cx - ((cx - view.x) * zoom) / view.zoom, y: cy - ((cy - view.y) * zoom) / view.zoom })
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        const j = parseJack(e.target as Element)
        if (j) onDisconnect((c) => (j.dir === 'in' ? c.dst_module === j.module && c.dst_port === j.port : c.src_module === j.module && c.src_port === j.port)) // right-click a jack: unplug it
      }}
    >
      <div className="layer" ref={layer} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        {patch.modules.map((inst) => {
          const manifest = manifests.get(inst.type)
          if (!manifest) return <section key={inst.id} className="module missing" style={{ left: inst.ui.x ?? 0, top: inst.ui.y ?? 0 }}><h2 className="module-label">{inst.name}</h2><p>Unknown module type “{inst.type}” (not ported yet).</p></section>
          return <ModuleView key={inst.id} inst={inst} manifest={manifest} connected={connected(inst.id)} onGrab={onGrab} onRemove={props.onRemove} onInput={props.onInput} onParam={props.onParam} onJackDown={onJackDown} />
        })}
        <svg className="cables">
          {patch.connections.map((c) => {
            const a = jacks.get(`${c.src_module}|${c.src_port}|out`)
            const b = jacks.get(`${c.dst_module}|${c.dst_port}|in`)
            if (!a || !b) return null
            const d = cablePath(a, b)
            const key = `${c.src_module}.${c.src_port}>${c.dst_module}.${c.dst_port}`
            return (
              <g key={key} className="cable" data-cable={key} onPointerDown={(e) => e.stopPropagation()} onClick={() => onDisconnect((x) => x.src_module === c.src_module && x.src_port === c.src_port && x.dst_module === c.dst_module && x.dst_port === c.dst_port)}>
                <path className="hit" d={d} />
                <path className="wire" d={d} style={{ stroke: KIND_COLOR[outKind(c)] ?? KIND_COLOR.signal }} />
              </g>
            )
          })}
          {wire && (() => {
            const at = jacks.get(`${wire.from.module}|${wire.from.port}|${wire.from.dir}`)
            if (!at) return null
            return <path className="wire pending" d={wire.from.dir === 'out' ? cablePath(at, wire) : cablePath(wire, at)} />
          })()}
        </svg>
      </div>
      {patch.modules.length === 0 && <p className="empty-hint">Add a module from <b>+ Module</b>, then drag from an output jack to an input jack.</p>}
    </div>
  )
}
