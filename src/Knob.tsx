import { useRef } from 'react'

const SWEEP = 270 // degrees from min to max, centred on 12 o'clock

function arc(r: number, from: number, to: number) {
  const pt = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return `${(20 + r * Math.cos(a)).toFixed(2)} ${(20 + r * Math.sin(a)).toFixed(2)}`
  }
  return `M ${pt(from)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${pt(to)}`
}

/** A rotary knob: drag up or down (Shift for fine), the wheel steps, double-click resets. */
export function Knob({ label, value, min, max, decimals = 2, onChange, onReset }: { label: string; value: number; min: number; max: number; decimals?: number; onChange: (v: number) => void; onReset: () => void }) {
  const drag = useRef<{ y: number; v: number } | null>(null)
  const span = max - min || 1
  const round = (v: number) => Number(Math.min(max, Math.max(min, v)).toFixed(Math.max(0, decimals)))
  const frac = Math.min(1, Math.max(0, (value - min) / span))
  const start = -SWEEP / 2
  const angle = start + frac * SWEEP
  return (
    <div className="knob" title={`${label}: ${value}`}>
      <svg
        viewBox="0 0 40 40"
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.stopPropagation()
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { y: e.clientY, v: value }
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const dy = drag.current.y - e.clientY
          onChange(round(drag.current.v + (dy / 150) * span * (e.shiftKey ? 0.1 : 1)))
        }}
        onPointerUp={() => (drag.current = null)}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onReset()
        }}
        onWheel={(e) => {
          e.stopPropagation()
          onChange(round(value + (e.deltaY < 0 ? 1 : -1) * span * (e.shiftKey ? 0.002 : 0.02)))
        }}
        onKeyDown={(e) => {
          const step = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0
          if (!step) return
          e.preventDefault()
          e.stopPropagation()
          onChange(round(value + step * span * (e.shiftKey ? 0.002 : 0.02)))
        }}
      >
        <path className="knob-track" d={arc(15, start, start + SWEEP)} />
        {frac > 0.002 && <path className="knob-value" d={arc(15, start, angle)} />}
        <circle className="knob-cap" cx="20" cy="20" r="10" />
        <line className="knob-pointer" x1="20" y1="20" x2={20 + 9 * Math.sin((angle * Math.PI) / 180)} y2={20 - 9 * Math.cos((angle * Math.PI) / 180)} />
      </svg>
      <span className="knob-label">{label}</span>
      <span className="knob-num">{Number(value.toFixed(Math.max(0, Math.min(decimals, 3))))}</span>
    </div>
  )
}
