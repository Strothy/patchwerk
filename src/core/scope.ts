// A scope channel's recent history: (sim time, value) pairs in a fixed ring, and the maths from a time window and a
// y range to canvas points. Pure: the Scope component draws what this returns.

export class Trace {
  private t: Float64Array
  private v: Float32Array
  private start = 0
  size = 0
  readonly capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
    this.t = new Float64Array(capacity)
    this.v = new Float32Array(capacity)
  }

  push(time: number, value: number) {
    const i = (this.start + this.size) % this.capacity
    this.t[i] = time
    this.v[i] = value
    if (this.size < this.capacity) this.size++
    else this.start = (this.start + 1) % this.capacity
  }

  clear() {
    this.start = 0
    this.size = 0
  }

  /** The newest n samples as [time, value] pairs, oldest first. */
  samples(n: number): [number, number][] {
    const out: [number, number][] = []
    for (let k = Math.max(0, this.size - n); k < this.size; k++) {
      const i = (this.start + k) % this.capacity
      out.push([this.t[i], this.v[i]])
    }
    return out
  }

  last(): number | undefined {
    return this.size ? this.v[(this.start + this.size - 1) % this.capacity] : undefined
  }

  /** The samples inside [now - window, now] as x in 0..w and y in 0..h (top = hi), oldest first. */
  points(now: number, window: number, lo: number, hi: number, w: number, h: number, gain = 1, offset = 0): number[] {
    const out: number[] = []
    const from = now - window
    for (let k = 0; k < this.size; k++) {
      const i = (this.start + k) % this.capacity
      if (this.t[i] < from) continue
      const v = this.v[i] * gain + offset
      out.push(((this.t[i] - from) / window) * w, h - ((v - lo) / (hi - lo)) * h)
    }
    return out
  }
}

/** The legacy `y_range` choices ("0-100", "-100-100", "-50-150", "0-200"). */
export function yRange(param: unknown): [number, number] {
  const m = String(param ?? '0-100').match(/^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/)
  const lo = m ? Number(m[1]) : 0
  const hi = m ? Number(m[2]) : 100
  return hi > lo ? [lo, hi] : [0, 100]
}

/** The legacy channel colour names, in the Cylix palette. */
export const TRACE_COLORS: Record<string, string> = { blue: '#5aa9ff', yellow: '#f2d23c', green: '#5fe08c', magenta: '#e070d8', red: '#e0736b', cyan: '#35d6bf', orange: '#f29a3c', white: '#d7e2dd' }
