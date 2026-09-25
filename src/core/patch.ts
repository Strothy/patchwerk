// The patch document and its edits, as plain functions over plain data (the legacy JSON format, meta.version 1).
// Every edit returns a new patch; the app keeps one in state and hands structural changes to the engine.

export type Port = { name: string; signal_kind: string; default: number }
export type Control = {
  key: string
  label: string
  control_type: string // knob | slider | selector | button | range_slider | ...
  value_source: string // input | param | auto
  default: unknown
  minimum: number
  maximum: number
  options: unknown[]
  decimals?: number
  momentary?: boolean
  show_on_node?: boolean
  advanced_only?: boolean
}
export type Manifest = {
  module_type: string
  category: string
  input_ports: Port[]
  output_ports: Port[]
  param_defaults: Record<string, unknown>
  controls: Control[]
}
export type ModuleInst = {
  id: string
  type: string
  name: string
  params: Record<string, unknown>
  inputs: Record<string, number>
  ui: { x?: number; y?: number; [k: string]: unknown }
}
export type Connection = { src_module: string; src_port: string; dst_module: string; dst_port: string; color_index: number }
export type Patch = { name: string; modules: ModuleInst[]; connections: Connection[]; meta?: { version: number; [k: string]: unknown }; [k: string]: unknown }

export const emptyPatch = (): Patch => ({ name: 'New Patch', modules: [], connections: [], meta: { version: 1 } })

/** Where a control's value lives: the module's `inputs` (a port's base, which cables modulate) or its `params`. */
export function controlIsInput(m: Manifest, c: Control): boolean {
  if (c.value_source === 'input') return true
  if (c.value_source === 'param') return false
  return m.input_ports.some((p) => p.name === c.key)
}

const num = (v: unknown, fallback: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : Number.NaN
  return Number.isFinite(n) ? n : fallback
}

/** A control's current value as the knob shows it (the base, not the modulated value). */
export function controlValue(m: Manifest, inst: ModuleInst, c: Control): unknown {
  if (controlIsInput(m, c)) return inst.inputs[c.key] ?? num(c.default, m.input_ports.find((p) => p.name === c.key)?.default ?? 0)
  return inst.params[c.key] ?? m.param_defaults[c.key] ?? c.default
}

/** The next free legacy-style id for a type: lfo_1, lfo_2, ... */
export function nextId(p: Patch, type: string): number {
  let n = 1
  while (p.modules.some((m) => m.id === `${type}_${n}`)) n++
  return n
}

export function addModule(p: Patch, m: Manifest, x: number, y: number): { patch: Patch; id: string } {
  const n = nextId(p, m.module_type)
  const id = `${m.module_type}_${n}`
  const inputs: Record<string, number> = {}
  for (const c of m.controls) if (controlIsInput(m, c)) inputs[c.key] = num(c.default, m.input_ports.find((q) => q.name === c.key)?.default ?? 0)
  const inst: ModuleInst = { id, type: m.module_type, name: `${m.module_type} ${n}`, params: structuredClone(m.param_defaults), inputs, ui: { x: Math.round(x), y: Math.round(y) } }
  return { patch: { ...p, modules: [...p.modules, inst] }, id }
}

export function removeModule(p: Patch, id: string): Patch {
  return { ...p, modules: p.modules.filter((m) => m.id !== id), connections: p.connections.filter((c) => c.src_module !== id && c.dst_module !== id) }
}

export function moveModule(p: Patch, id: string, x: number, y: number): Patch {
  return { ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, ui: { ...m.ui, x: Math.round(x), y: Math.round(y) } } : m)) }
}

/** A cable from an output to an input. Inputs take several cables (the engine sums or maxes them); an identical cable is not doubled. */
export function connect(p: Patch, src: string, srcPort: string, dst: string, dstPort: string): Patch {
  if (p.connections.some((c) => c.src_module === src && c.src_port === srcPort && c.dst_module === dst && c.dst_port === dstPort)) return p
  return { ...p, connections: [...p.connections, { src_module: src, src_port: srcPort, dst_module: dst, dst_port: dstPort, color_index: 0 }] }
}

export function disconnect(p: Patch, match: (c: Connection) => boolean): Patch {
  return { ...p, connections: p.connections.filter((c) => !match(c)) }
}

export function setInput(p: Patch, id: string, key: string, value: number): Patch {
  return { ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, inputs: { ...m.inputs, [key]: value } } : m)) }
}

export function setParam(p: Patch, id: string, key: string, value: unknown): Patch {
  return { ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, params: { ...m.params, [key]: value } } : m)) }
}

/** What the engine must rebuild for: modules added or removed, cables changed. A knob turn or a move is not structural. */
export function structureKey(p: Patch): string {
  return JSON.stringify([p.modules.map((m) => `${m.id}:${m.type}`), p.connections.map((c) => `${c.src_module}.${c.src_port}>${c.dst_module}.${c.dst_port}`)])
}
