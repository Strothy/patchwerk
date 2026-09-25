import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { layout, problems } from './layout.ts'
import type { Manifest } from './patch.ts'

const dir = new URL('../../fixtures/manifests/', import.meta.url)
const manifests: Manifest[] = readdirSync(dir).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')))

test('every legacy module lays out: fits, on the grid, inside its face, nothing overlapping, nothing missing', () => {
  const bad = manifests.map((m) => ({ m, p: problems(m, layout(m)) })).filter((r) => r.p.length)
  assert.equal(manifests.length, 80)
  assert.deepEqual(bad.map((r) => `${r.m.module_type}: ${r.p.slice(0, 3).join('; ')}`), [])
})

test('width comes from content: more jacks or controls never make a module narrower', () => {
  const lfo = manifests.find((m) => m.module_type === 'lfo')!
  const hp = layout(lfo).hp
  const more = { ...lfo, input_ports: [...lfo.input_ports, ...lfo.input_ports.map((p) => ({ ...p, name: p.name + '2' }))] }
  assert.ok(layout(more).hp >= hp)
  const fewer = { ...lfo, controls: [] }
  assert.ok(layout(fewer).hp <= hp)
})

test('inputs sit left of outputs, and a primary hint makes a knob large and first', () => {
  const lfo = manifests.find((m) => m.module_type === 'lfo')!
  const f = layout(lfo)
  const ins = f.boxes.filter((b) => b.dir === 'in')
  const outs = f.boxes.filter((b) => b.dir === 'out')
  assert.ok(Math.max(...ins.map((b) => b.x + b.w)) <= Math.min(...outs.map((b) => b.x)))
  const hinted = layout({ ...lfo, face: { primary: ['rate'] } } as Manifest)
  const rate = hinted.boxes.find((b) => b.key === 'rate' && b.kind !== 'jack')!
  assert.equal(rate.kind, 'knobL')
  assert.ok(hinted.boxes.filter((b) => b.kind !== 'jack').every((b) => b === rate || b.y > rate.y || b.x > rate.x))
})
