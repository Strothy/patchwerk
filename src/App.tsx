import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, type View } from './Canvas.tsx'
import { addModule, connect, disconnect, emptyPatch, moveModule, removeModule, setInput, setParam, structureKey, type Connection, type Manifest, type Patch } from './core/patch.ts'
import * as engine from './engine.ts'
import { report } from './errlog.ts'

/** The module menu: every type the engine knows, by category. */
function AddMenu({ manifests, onPick, onClose }: { manifests: Manifest[]; onPick: (m: Manifest) => void; onClose: () => void }) {
  const cats = [...new Set(manifests.map((m) => m.category || 'Other'))].sort()
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  return (
    <>
      <div className="scrim" onPointerDown={onClose} />
      <div className="ctx add-menu" role="menu">
        {cats.map((cat) => (
          <div key={cat}>
            <div className="ctx-group">{cat}</div>
            {manifests.filter((m) => (m.category || 'Other') === cat).map((m) => (
              <button key={m.module_type} role="menuitem" data-add={m.module_type} onClick={() => onPick(m)}>{m.module_type}</button>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

/** Sim time and whether the engine is streaming, polled a few times a second (the stream itself is not React state). */
function useLive() {
  const [s, set] = useState({ playing: false, simTime: 0, batches: 0 })
  useEffect(() => {
    const id = setInterval(() => set({ playing: live.playing, simTime: live.simTime, batches: live.batches }), 150)
    return () => clearInterval(id)
  }, [])
  return s
}
const live = engine.live

export default function App() {
  const [manifests, setManifests] = useState<Manifest[]>([])
  const [patch, setPatch] = useState<Patch>(emptyPatch)
  const [view, setView] = useState<View>({ x: 80, y: 60, zoom: 1 })
  const [menu, setMenu] = useState(false)
  const status = useLive()
  const byType = useMemo(() => new Map(manifests.map((m) => [m.module_type, m])), [manifests])
  const latest = useRef({ patch, view, byType })
  latest.current = { patch, view, byType }

  useEffect(() => {
    engine.subscribe().catch((e) => report('error', `engine subscribe: ${e}`))
    engine.catalog().then(setManifests, (e) => report('error', `catalog: ${e}`))
    getCurrentWindow().show().catch(() => {}) // the window starts hidden so it never flashes white
  }, [])

  // The engine rebuilds only for structural changes; knob turns go straight to it (setInput / setParam).
  const structure = structureKey(patch)
  useEffect(() => {
    engine.load(latest.current.patch).catch((e) => report('error', `engine load: ${e}`))
  }, [structure])

  const actions = {
    add(type: string, x?: number, y?: number) {
      const m = latest.current.byType.get(type)
      if (!m) throw new Error(`unknown module type ${type}`)
      const { view } = latest.current
      const box = document.querySelector('.canvas')?.getBoundingClientRect()
      const cx = x ?? ((box ? box.width / 2 : 400) - view.x) / view.zoom - 90
      const cy = y ?? ((box ? box.height / 2 : 300) - view.y) / view.zoom - 80
      const r = addModule(latest.current.patch, m, cx, cy)
      latest.current.patch = r.patch
      setPatch(r.patch)
      return r.id
    },
    connect(src: string, srcPort: string, dst: string, dstPort: string) {
      setPatch((p) => (latest.current.patch = connect(p, src, srcPort, dst, dstPort)))
    },
    disconnect(match: (c: Connection) => boolean) {
      setPatch((p) => (latest.current.patch = disconnect(p, match)))
    },
    remove(id: string) {
      setPatch((p) => (latest.current.patch = removeModule(p, id)))
    },
    move(id: string, x: number, y: number) {
      setPatch((p) => moveModule(p, id, x, y))
    },
    input(id: string, key: string, value: number) {
      setPatch((p) => (latest.current.patch = setInput(p, id, key, value)))
      engine.setInput(id, key, value).catch((e) => report('error', `set input: ${e}`))
    },
    param(id: string, key: string, value: unknown) {
      setPatch((p) => (latest.current.patch = setParam(p, id, key, value)))
      engine.setParam(id, key, value).catch((e) => report('error', `set param: ${e}`))
    },
    transport(a: 'play' | 'pause' | 'stop') {
      engine.transport(a).catch((e) => report('error', `transport: ${e}`))
    },
  }

  // e2e hooks (dev builds only): the suites drive the app through these, never through a mock of it
  if (import.meta.env.DEV) Object.assign(window, { patchwerkApp: { actions, live, patch: () => latest.current.patch, manifests: () => latest.current.byType } })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return
      if (e.key === 'a' || e.key === 'A') setMenu(true)
      else if (e.key === ' ') {
        e.preventDefault()
        engine.transport(live.playing ? 'pause' : 'play')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">PATCHWERK</span>
        <span className="tagline">modular motion</span>
        <button className="ws" onClick={() => setMenu(true)} title="Add a module (A)">+ Module</button>
        <span className="spacer" />
        <div className="transport-btns" role="group" aria-label="Transport">
          <button className={`btn${status.playing ? ' on' : ''}`} data-transport="play" onClick={() => actions.transport('play')} title="Play (Space)">▶</button>
          <button className="btn" data-transport="pause" onClick={() => actions.transport('pause')} title="Pause (Space)">❚❚</button>
          <button className="btn" data-transport="stop" onClick={() => actions.transport('stop')} title="Stop: pause and reset every module">■</button>
        </div>
        <span className="readout-time" data-simtime>{status.simTime.toFixed(2)} s</span>
      </header>
      <main className="body">
        <Canvas
          patch={patch}
          manifests={byType}
          view={view}
          setView={setView}
          onMove={actions.move}
          onConnect={actions.connect}
          onDisconnect={actions.disconnect}
          onRemove={actions.remove}
          onInput={actions.input}
          onParam={actions.param}
        />
      </main>
      <footer className="statusbar">
        <span><span className={`led${status.playing ? ' on' : ''}`} />{status.playing ? 'Running' : 'Stopped'}</span>
        <span>{patch.modules.length} module{patch.modules.length === 1 ? '' : 's'} · {patch.connections.length} cable{patch.connections.length === 1 ? '' : 's'}</span>
        <span className="spacer" />
        <span className="readout">v{__APP_VERSION__} · {__BUILD__}</span>
      </footer>
      {menu && <AddMenu manifests={manifests} onClose={() => setMenu(false)} onPick={(m) => { actions.add(m.module_type); setMenu(false) }} />}
    </div>
  )
}
