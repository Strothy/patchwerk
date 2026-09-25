import type { PointerEvent as RPointerEvent } from 'react'
import { CELL, HEIGHT, RAIL_BOTTOM, type Box, type Face } from './core/layout.ts'
import { controlIsInput, controlValue, type Control, type Manifest, type ModuleInst } from './core/patch.ts'
import { Knob } from './Knob.tsx'
import { Scope } from './Scope.tsx'

export type JackDown = (e: RPointerEvent, module: string, port: string, dir: 'in' | 'out') => void

type Props = {
  inst: ModuleInst
  manifest: Manifest
  face: Face
  connected: (port: string) => boolean
  onGrab?: (e: RPointerEvent, id: string) => void
  onRemove?: (id: string) => void
  onInput: (id: string, key: string, value: number) => void
  onParam: (id: string, key: string, value: unknown) => void
  onJackDown?: JackDown
}

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d)
const KNOB_DIAMETER = { knobS: 26, knob: 40, knobL: 56 } as const

function ControlView({ c, box, inst, manifest, onInput, onParam }: { c: Control; box: Box } & Pick<Props, 'inst' | 'manifest' | 'onInput' | 'onParam'>) {
  const isInput = controlIsInput(manifest, c)
  const value = controlValue(manifest, inst, c)
  const set = (v: unknown) => (isInput ? onInput(inst.id, c.key, num(v, 0)) : onParam(inst.id, c.key, v))
  const label = c.label || c.key
  if (box.kind === 'knobS' || box.kind === 'knob' || box.kind === 'knobL') {
    const range = (inst.ui.control_ranges as Record<string, { min?: number; max?: number }> | undefined)?.[c.key]
    const min = num(range?.min, c.minimum)
    const max = num(range?.max, c.maximum)
    return <Knob label={label} size={KNOB_DIAMETER[box.kind]} value={num(value, c.minimum)} min={Math.min(min, max)} max={Math.max(min, max)} decimals={c.decimals ?? 2} onChange={set} onReset={() => set(num(c.default, c.minimum))} />
  }
  if (box.kind === 'selector' || box.kind === 'selectorW') {
    const opts = c.options.map(String)
    const current = isInput ? opts[Math.round(num(value, 0))] : String(value)
    return (
      <label className="sel">
        <span>{label}</span>
        <select value={current} onChange={(e) => set(isInput ? opts.indexOf(e.target.value) : typeof c.default === 'number' ? num(e.target.value, 0) : e.target.value)} onPointerDown={(e) => e.stopPropagation()}>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    )
  }
  if (box.kind === 'button') {
    const [off, on] = c.options.length >= 2 ? c.options : [0, 1]
    const pressed = String(value) === String(on)
    return (
      <button
        className={`btn mod-btn${pressed ? ' on' : ''}`}
        title={label}
        onPointerDown={(e) => {
          e.stopPropagation()
          set(c.momentary ? on : pressed ? off : on)
        }}
        onPointerUp={() => c.momentary && set(off)}
      >
        {label}
      </button>
    )
  }
  return <span className="stub" title={`${c.control_type}: no widget yet`}>{label}</span> // ponytail: range sliders, curve editors and step grids get widgets with their modules (M4/M6)
}

/** One module: its face drawn from layout() boxes. Nothing here decides a position (docs/LAYOUT.md). */
export function ModuleView(props: Props) {
  const { inst, manifest, face, connected, onGrab, onRemove, onJackDown } = props
  const controls = new Map(manifest.controls.map((c) => [c.key, c]))
  const jackTop = Math.min(HEIGHT - RAIL_BOTTOM, ...face.boxes.filter((b) => b.kind === 'jack').map((b) => b.y))
  const px = (b: Box) => ({ left: b.x * CELL, top: b.y * CELL, width: b.w * CELL, height: b.h * CELL })
  return (
    <section className={`module cat-${manifest.category.toLowerCase()}`} style={{ left: inst.ui.x ?? 0, top: inst.ui.y ?? 0, width: face.hp * CELL, height: HEIGHT * CELL }} data-module={inst.id} data-hp={face.hp}>
      <h2 className="rail top" onPointerDown={(e) => onGrab?.(e, inst.id)}>
        <i className="screw" />
        <span className="name">{inst.name}</span>
        {onRemove && <button className="x" title="Remove" onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(inst.id)}>✕</button>}
        <i className="screw" />
      </h2>
      {jackTop < HEIGHT - RAIL_BOTTOM && <div className="jack-zone" style={{ top: jackTop * CELL, bottom: RAIL_BOTTOM * CELL }} />}
      {face.boxes.map((b) => {
        if (b.kind === 'jack')
          return (
            <div key={`${b.dir}:${b.key}`} className={`slot jack-slot ${b.dir}`} style={px(b)}>
              <span
                className={`jack ${b.dir} ${[...manifest.input_ports, ...manifest.output_ports].find((p) => p.name === b.key)?.signal_kind ?? 'signal'}${b.dir === 'in' && connected(b.key) ? ' plugged' : ''}`}
                data-jack={`${inst.id}|${b.key}|${b.dir}`}
                onPointerDown={(e) => onJackDown?.(e, inst.id, b.key, b.dir!)}
              />
              <span className="jack-label">{b.key}</span>
            </div>
          )
        if (b.kind === 'screen') return <div key="screen" className="slot screen" style={px(b)}>{inst.type === 'scope_4ch' && <Scope inst={inst} connected={connected} />}</div>
        const c = controls.get(b.key)
        return c ? <div key={b.key} className={`slot ${b.kind}`} style={px(b)}><ControlView c={c} box={b} {...props} /></div> : null
      })}
      <div className="rail bottom"><i className="screw" /><i className="screw" /></div>
    </section>
  )
}
