// A module's faceplate as data: layout(manifest) -> a box for every control and jack, in grid cells. The one and only
// place anything is positioned (docs/LAYOUT.md). Pure; the app, the gallery and the tests all call it.
import type { Control, Manifest } from './patch.ts'

export const CELL = 20 // px per grid cell at zoom 1
export const HEIGHT = 20 // cells; every module is this tall
export const RAIL_TOP = 2
export const RAIL_BOTTOM = 1
export const MIN_HP = 4
export const MAX_HP = 64

export type Kind = 'knobS' | 'knob' | 'knobL' | 'selector' | 'selectorW' | 'button' | 'jack' | 'screen' | 'unsupported'

/** Footprints in cells [w, h], label and readout included. Change one and every module re-lays out. */
export const FOOTPRINT: Record<Exclude<Kind, 'screen'>, [number, number]> = {
  knobS: [2, 3],
  knob: [3, 4],
  knobL: [4, 5],
  selector: [4, 2],
  selectorW: [5, 2],
  button: [3, 2],
  jack: [3, 3],
  unsupported: [3, 2],
}
const SCREEN_H = 7
const SCREEN_MIN_W = 14
const SCREENS = new Set(['scope_4ch']) // module types with a display block

export type Box = { kind: Kind; key: string; x: number; y: number; w: number; h: number; dir?: 'in' | 'out' }
export type Face = { hp: number; boxes: Box[]; error?: string }
export type Hints = { primary?: string[]; small?: string[]; order?: string[]; hide?: string[] }

/** A range bound (`x_min` / `x_max` beside an `x` control) is secondary to its knob: it gets the small one. */
const isBound = (c: Control, all: Control[]) => /^(.+)_(min|max)$/.test(c.key) && all.some((o) => o.key === c.key.replace(/_(min|max)$/, ''))

function kindOf(c: Control, h: Hints, all: Control[]): Kind {
  if (c.control_type === 'knob' || c.control_type === 'slider') return h.primary?.includes(c.key) ? 'knobL' : h.small?.includes(c.key) || isBound(c, all) ? 'knobS' : 'knob'
  if (c.control_type === 'selector') return c.options.some((o) => String(o).length > 7) ? 'selectorW' : 'selector'
  if (c.control_type === 'button') return 'button'
  return 'unsupported'
}

/** The controls that go on the face, in placement order: primary hints first, then hint order, then manifest order. */
export function faceControls(m: Manifest): Control[] {
  const h = hintsOf(m)
  const shown = m.controls.filter((c) => c.show_on_node !== false && !c.advanced_only && !h.hide?.includes(c.key))
  const rank = (c: Control) => {
    const p = h.primary?.indexOf(c.key) ?? -1
    if (p >= 0) return p
    const o = h.order?.indexOf(c.key) ?? -1
    return o >= 0 ? 100 + o : 1000 + m.controls.indexOf(c)
  }
  return [...shown].sort((a, b) => rank(a) - rank(b))
}

export const hintsOf = (m: Manifest): Hints => ((m as { face?: Hints }).face ?? {})

/** Jack columns for inputs and outputs that need the fewest rows in `cols` columns; null when they cannot share them. */
function splitJacks(nIn: number, nOut: number, cols: number): { ci: number; co: number; rows: number } | null {
  if (!nIn || !nOut) {
    const n = nIn || nOut
    return n ? { ci: nIn ? Math.min(cols, n) : 0, co: nOut ? Math.min(cols, n) : 0, rows: Math.ceil(n / cols) } : { ci: 0, co: 0, rows: 0 }
  }
  let best: { ci: number; co: number; rows: number } | null = null
  for (let ci = 1; ci < cols; ci++) {
    const co = cols - ci
    const rows = Math.max(Math.ceil(nIn / ci), Math.ceil(nOut / co))
    if (!best || rows < best.rows) best = { ci: Math.min(ci, nIn), co: Math.min(co, nOut), rows }
  }
  return best
}

/** Tries one width; the boxes when everything fits, else null. */
function tryWidth(m: Manifest, hp: number): Box[] | null {
  const boxes: Box[] = []
  const [jw, jh] = FOOTPRINT.jack
  const nIn = m.input_ports.length
  const nOut = m.output_ports.length
  const cols = Math.floor(hp / jw)
  if (cols < (nIn && nOut ? 2 : nIn || nOut ? 1 : 0)) return null
  const split = splitJacks(nIn, nOut, cols)
  if (!split) return null
  const jackTop = HEIGHT - RAIL_BOTTOM - split.rows * jh
  // jacks: inputs block on the left, outputs block on the right, filled row by row
  m.input_ports.forEach((p, i) => boxes.push({ kind: 'jack', key: p.name, dir: 'in', x: (i % split.ci) * jw, y: jackTop + Math.floor(i / split.ci) * jh, w: jw, h: jh }))
  m.output_ports.forEach((p, i) => boxes.push({ kind: 'jack', key: p.name, dir: 'out', x: hp - (split.co - (i % split.co)) * jw, y: jackTop + Math.floor(i / split.co) * jh, w: jw, h: jh }))

  let y = RAIL_TOP
  if (SCREENS.has(m.module_type)) {
    if (hp < SCREEN_MIN_W) return null
    boxes.push({ kind: 'screen', key: 'screen', x: 0, y, w: hp, h: SCREEN_H })
    y += SCREEN_H
  }
  // controls: shelves, left to right, each row centred
  const h = hintsOf(m)
  let row: Box[] = []
  let rowW = 0
  let rowH = 0
  const flush = () => {
    const shift = Math.floor((hp - rowW) / 2)
    for (const b of row) b.x += shift
    boxes.push(...row)
    y += rowH
    row = []
    rowW = 0
    rowH = 0
  }
  for (const c of faceControls(m)) {
    const kind = kindOf(c, h, m.controls)
    const [w, hh] = FOOTPRINT[kind as keyof typeof FOOTPRINT]
    if (w > hp) return null
    if (rowW + w > hp) flush()
    row.push({ kind, key: c.key, x: rowW, y, w, h: hh })
    rowW += w
    rowH = Math.max(rowH, hh)
  }
  if (row.length) flush()
  return y <= jackTop ? boxes : null
}

export function layout(m: Manifest): Face {
  for (let hp = MIN_HP; hp <= MAX_HP; hp++) {
    const boxes = tryWidth(m, hp)
    if (boxes) return { hp, boxes }
  }
  return { hp: MAX_HP, boxes: [], error: `${m.module_type} does not fit in ${MAX_HP} HP at the fixed height` }
}

/** Every rule the test checks, as a list of problems (empty = a valid face). */
export function problems(m: Manifest, f: Face): string[] {
  if (f.error) return [f.error]
  const out: string[] = []
  for (const b of f.boxes) {
    if (b.x < 0 || b.x + b.w > f.hp || b.y < RAIL_TOP || b.y + b.h > HEIGHT - RAIL_BOTTOM) out.push(`${b.key} is outside the face`)
    if (![b.x, b.y, b.w, b.h].every(Number.isInteger)) out.push(`${b.key} is off the grid`)
  }
  for (let i = 0; i < f.boxes.length; i++)
    for (let j = i + 1; j < f.boxes.length; j++) {
      const a = f.boxes[i]
      const b = f.boxes[j]
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) out.push(`${a.key} overlaps ${b.key}`)
    }
  const has = (key: string, dir?: string) => f.boxes.some((b) => b.key === key && b.dir === dir)
  for (const p of m.input_ports) if (!has(p.name, 'in')) out.push(`input ${p.name} has no jack`)
  for (const p of m.output_ports) if (!has(p.name, 'out')) out.push(`output ${p.name} has no jack`)
  for (const c of faceControls(m)) if (!has(c.key)) out.push(`control ${c.key} has no box`)
  return out
}
