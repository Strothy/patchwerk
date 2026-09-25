// The bridge to the Rust engine: commands out, and the stream of watched values in. Values land in plain mutable
// stores (not React state): the scope and meters read them in their own animation frames, 60 times a second.
import { Channel, invoke } from '@tauri-apps/api/core'
import { report } from './errlog.ts'
import type { Manifest, Patch } from './core/patch.ts'
import { Trace } from './core/scope.ts'

export type Tap = { module: string; port: string; kind: 'in' | 'out' }
type Batch = { layout: number; taps?: Tap[]; playing: boolean; t: number[]; values: number[] }

const HISTORY = 60 * 60 // a minute at 60 ticks a second: the longest scope window

/** The latest state of the stream. `value(module, port, kind)` is the newest value of a tap. */
export const live = {
  layout: 0,
  taps: [] as Tap[],
  index: new Map<string, number>(),
  latest: new Float32Array(0),
  playing: false,
  simTime: 0,
  batches: 0,
  /** Scope input history by `module:port`. */
  traces: new Map<string, Trace>(),
  value(module: string, port: string, kind: 'in' | 'out' = 'out'): number | undefined {
    const i = this.index.get(`${kind}:${module}:${port}`)
    return i === undefined ? undefined : this.latest[i]
  },
}

function onBatch(b: Batch) {
  if (b.taps) {
    live.layout = b.layout
    live.taps = b.taps
    live.index = new Map(b.taps.map((t, i) => [`${t.kind}:${t.module}:${t.port}`, i]))
    live.latest = new Float32Array(b.taps.length)
    const keep = new Set(b.taps.filter((t) => t.kind === 'in').map((t) => `${t.module}:${t.port}`))
    for (const k of live.traces.keys()) if (!keep.has(k)) live.traces.delete(k)
    for (const k of keep) if (!live.traces.has(k)) live.traces.set(k, new Trace(HISTORY))
  }
  live.playing = b.playing
  live.batches++
  if (b.layout !== live.layout || !b.t.length) return
  if (b.t[0] < live.simTime) for (const tr of live.traces.values()) tr.clear() // a stop reset the clock
  const n = live.taps.length
  for (let f = 0; f < b.t.length; f++) {
    const row = b.values.slice(f * n, f * n + n)
    live.latest.set(row)
    for (let i = 0; i < n; i++) {
      const tap = live.taps[i]
      if (tap.kind === 'in') live.traces.get(`${tap.module}:${tap.port}`)?.push(b.t[f], row[i])
    }
  }
  live.simTime = b.t[b.t.length - 1]
}

export async function subscribe() {
  const ch = new Channel<Batch>()
  ch.onmessage = (b) => {
    try {
      onBatch(b)
    } catch (e) {
      report('error', `engine batch: ${e instanceof Error ? e.stack ?? e.message : String(e)}`) // a throw here would stall the channel
    }
  }
  await invoke('engine_subscribe', { onBatch: ch })
}

export const catalog = () => invoke<Manifest[]>('catalog')
export const load = (patch: Patch) => invoke('engine_load', { patch })
export const setInput = (module: string, port: string, value: number) => invoke('engine_set_input', { module, port, value })
export const setParam = (module: string, key: string, value: unknown) => invoke('engine_set_param', { module, key, value })
export const transport = (action: 'play' | 'pause' | 'stop') => invoke('engine_transport', { action })
