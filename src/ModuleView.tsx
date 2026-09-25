import type { PointerEvent as RPointerEvent } from 'react'
import { controlIsInput, controlValue, type Control, type Manifest, type ModuleInst } from './core/patch.ts'
import { Knob } from './Knob.tsx'
import { Scope } from './Scope.tsx'

export type JackDown = (e: RPointerEvent, module: string, port: string, dir: 'in' | 'out') => void

type Props = {
  inst: ModuleInst
  manifest: Manifest
  connected: (port: string) => boolean
  onGrab: (e: RPointerEvent, id: string) => void
  onRemove: (id: string) => void
  onInput: (id: string, key: string, value: number) => void
  onParam: (id: string, key: string, value: unknown) => void
  onJackDown: JackDown
}

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d)

function ControlView({ c, inst, manifest, onInput, onParam }: { c: Control } & Pick<Props, 'inst' | 'manifest' | 'onInput' | 'onParam'>) {
  const isInput = controlIsInput(manifest, c)
  const value = controlValue(manifest, inst, c)
  const set = (v: unknown) => (isInput ? onInput(inst.id, c.key, num(v, 0)) : onParam(inst.id, c.key, v))
  if (c.control_type === 'knob' || c.control_type === 'slider') {
    const range = (inst.ui.control_ranges as Record<string, { min?: number; max?: number }> | undefined)?.[c.key]
    const min = num(range?.min, c.minimum)
    const max = num(range?.max, c.maximum)
    return <Knob label={c.label || c.key} value={num(value, c.minimum)} min={Math.min(min, max)} max={Math.max(min, max)} decimals={c.decimals ?? 2} onChange={set} onReset={() => set(num(c.default, c.minimum))} />
  }
  if (c.control_type === 'selector' && c.options.length) {
    const opts = c.options.map(String)
    const current = isInput ? opts[Math.round(num(value, 0))] : String(value)
    return (
      <label className="sel">
        <span>{c.label || c.key}</span>
        <select value={current} onChange={(e) => set(isInput ? opts.indexOf(e.target.value) : typeof c.default === 'number' ? num(e.target.value, 0) : e.target.value)} onPointerDown={(e) => e.stopPropagation()}>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    )
  }
  if (c.control_type === 'button') {
    const [off, on] = c.options.length >= 2 ? c.options : [0, 1]
    const pressed = String(value) === String(on)
    return (
      <button
        className={`btn mod-btn${pressed ? ' on' : ''}`}
        onPointerDown={(e) => {
          e.stopPropagation()
          set(c.momentary ? on : pressed ? off : on)
        }}
        onPointerUp={() => c.momentary && set(off)}
      >
        {c.label || c.key}
      </button>
    )
  }
  return null // ponytail: range sliders, curve editors and the rest land with their modules (M4/M6)
}

/** One module on the canvas: a Cylix-style panel with its controls and its jacks (inputs left, outputs right). */
export function ModuleView(props: Props) {
  const { inst, manifest, connected, onGrab, onRemove, onJackDown } = props
  const controls = manifest.controls.filter((c) => c.show_on_node !== false && !c.advanced_only)
  const jack = (port: string, dir: 'in' | 'out', kind: string) => (
    <span
      className={`jack ${dir} ${kind}${dir === 'in' && connected(port) ? ' plugged' : ''}`}
      data-jack={`${inst.id}|${port}|${dir}`}
      onPointerDown={(e) => onJackDown(e, inst.id, port, dir)}
    />
  )
  return (
    <section className={`module cat-${manifest.category.toLowerCase()}`} style={{ left: inst.ui.x ?? 0, top: inst.ui.y ?? 0 }} data-module={inst.id}>
      <h2 className="module-label" onPointerDown={(e) => onGrab(e, inst.id)}>
        {inst.name}
        <button className="x" title="Remove" onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(inst.id)}>✕</button>
      </h2>
      {inst.type === 'scope_4ch' && <Scope inst={inst} connected={connected} />}
      {controls.length > 0 && (
        <div className="controls">
          {controls.map((c) => <ControlView key={c.key} c={c} {...props} />)}
        </div>
      )}
      <div className="ports">
        <div className="col">
          {manifest.input_ports.map((p) => (
            <div className="port" key={p.name}>
              {jack(p.name, 'in', p.signal_kind)}
              <span>{p.name}</span>
            </div>
          ))}
        </div>
        <div className="col right">
          {manifest.output_ports.map((p) => (
            <div className="port" key={p.name}>
              <span>{p.name}</span>
              {jack(p.name, 'out', p.signal_kind)}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
