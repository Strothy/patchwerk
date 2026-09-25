// Every legacy module's face, drawn by the real layout() and the real widgets, for design review (docs/LAYOUT.md).
// Dev only: http://localhost:5183/?gallery (no engine; values are the defaults, and knobs move locally).
import { useMemo, useState } from 'react'
import { CELL, layout, problems } from './core/layout.ts'
import { addModule, emptyPatch, setInput, setParam, type Manifest, type Patch } from './core/patch.ts'
import { ModuleView } from './ModuleView.tsx'

const files = import.meta.glob<Manifest>('../fixtures/manifests/*.json', { eager: true, import: 'default' })
const manifests = Object.values(files).sort((a, b) => a.category.localeCompare(b.category) || a.module_type.localeCompare(b.module_type))

export default function Gallery() {
  const faces = useMemo(() => new Map(manifests.map((m) => [m.module_type, layout(m)])), [])
  const [patch, setPatch] = useState<Patch>(() => manifests.reduce((p, m) => addModule(p, m, 0, 0).patch, emptyPatch()))
  const [cat, setCat] = useState('')
  const bad = manifests.map((m) => [m.module_type, problems(m, faces.get(m.module_type)!)] as const).filter(([, p]) => p.length)
  const cats = [...new Set(manifests.map((m) => m.category))]
  const totalHp = manifests.reduce((n, m) => n + faces.get(m.module_type)!.hp, 0)
  return (
    <div className="gallery">
      <header className="topbar">
        <span className="brand">PATCHWERK</span>
        <span className="tagline">module gallery · {manifests.length} modules · {totalHp} HP · 1 HP = {CELL} px</span>
        <span className="spacer" />
        <label className="sel inline">
          <span>category</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">all</option>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </header>
      {bad.length > 0 && <p className="gallery-bad">{bad.length} modules break the layout rules: {bad.map(([t, p]) => `${t} (${p[0]})`).join(', ')}</p>}
      <div className="gallery-grid">
        {manifests.filter((m) => !cat || m.category === cat).map((m) => {
          const inst = patch.modules.find((q) => q.type === m.module_type)!
          const face = faces.get(m.module_type)!
          return (
            <figure key={m.module_type} data-gallery={m.module_type}>
              <div className="gallery-face" style={{ width: face.hp * CELL }}>
                <ModuleView
                  inst={{ ...inst, ui: { ...inst.ui, x: 0, y: 0 } }}
                  manifest={m}
                  face={face}
                  connected={() => false}
                  onInput={(id, k, v) => setPatch((p) => setInput(p, id, k, v))}
                  onParam={(id, k, v) => setPatch((p) => setParam(p, id, k, v))}
                />
              </div>
              <figcaption>{m.module_type} · {face.hp} HP · {m.category}</figcaption>
            </figure>
          )
        })}
      </div>
    </div>
  )
}
