import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addModule, connect, controlValue, disconnect, emptyPatch, moveModule, removeModule, setInput, structureKey, type Manifest } from './patch.ts'

const lfo: Manifest = {
  module_type: 'lfo',
  category: 'Generator',
  input_ports: [{ name: 'rate', signal_kind: 'signal', default: 0.1 }, { name: 'amp', signal_kind: 'signal', default: 10 }, { name: 'reset', signal_kind: 'trigger', default: 0 }],
  output_ports: [{ name: 'out', signal_kind: 'signal', default: 0 }],
  param_defaults: { shape: 'sine' },
  controls: [
    { key: 'shape', label: 'shape', control_type: 'selector', value_source: 'param', default: 'sine', minimum: 0, maximum: 100, options: ['sine', 'saw'] },
    { key: 'rate', label: 'rate', control_type: 'knob', value_source: 'input', default: 0.1, minimum: 0.01, maximum: 2, options: [] },
    { key: 'amp', label: 'amp', control_type: 'knob', value_source: 'input', default: 10, minimum: 0, maximum: 100, options: [] },
  ],
}

test('a new module gets a legacy-style id, its param defaults and its knob bases', () => {
  let { patch, id } = addModule(emptyPatch(), lfo, 10.4, 20.6)
  assert.equal(id, 'lfo_1')
  const m = patch.modules[0]
  assert.deepEqual(m.params, { shape: 'sine' })
  assert.deepEqual(m.inputs, { rate: 0.1, amp: 10 })
  assert.deepEqual([m.ui.x, m.ui.y], [10, 21])
  ;({ patch, id } = addModule(patch, lfo, 0, 0))
  assert.equal(id, 'lfo_2')
  ;({ patch, id } = addModule(removeModule(patch, 'lfo_1'), lfo, 0, 0))
  assert.equal(id, 'lfo_1', 'a freed id is reused')
})

test('the param defaults are copied, not shared', () => {
  const { patch } = addModule(emptyPatch(), lfo, 0, 0)
  patch.modules[0].params.shape = 'saw'
  assert.equal(lfo.param_defaults.shape, 'sine')
})

test('cables: no doubles, removed with their module, removable by match', () => {
  let p = addModule(addModule(emptyPatch(), lfo, 0, 0).patch, lfo, 0, 0).patch
  p = connect(p, 'lfo_1', 'out', 'lfo_2', 'amp')
  p = connect(p, 'lfo_1', 'out', 'lfo_2', 'amp')
  assert.equal(p.connections.length, 1)
  assert.equal(disconnect(p, (c) => c.dst_port === 'amp').connections.length, 0)
  assert.equal(removeModule(p, 'lfo_1').connections.length, 0)
})

test('only adding, removing and cabling are structural', () => {
  const p = addModule(emptyPatch(), lfo, 0, 0).patch
  const key = structureKey(p)
  assert.equal(structureKey(setInput(p, 'lfo_1', 'rate', 1)), key)
  assert.equal(structureKey(moveModule(p, 'lfo_1', 50, 50)), key)
  assert.notEqual(structureKey(connect(p, 'lfo_1', 'out', 'lfo_1', 'amp')), key)
})

test('a knob shows its base; a param control its param', () => {
  const p = setInput(addModule(emptyPatch(), lfo, 0, 0).patch, 'lfo_1', 'rate', 1.5)
  assert.equal(controlValue(lfo, p.modules[0], lfo.controls[1]), 1.5)
  assert.equal(controlValue(lfo, p.modules[0], lfo.controls[0]), 'sine')
})
