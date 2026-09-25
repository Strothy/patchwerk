import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Trace, yRange } from './scope.ts'

test('the ring keeps the newest samples once full', () => {
  const tr = new Trace(3)
  for (let i = 1; i <= 5; i++) tr.push(i, i * 10)
  assert.equal(tr.size, 3)
  assert.equal(tr.last(), 50)
  assert.deepEqual(tr.samples(2), [[4, 40], [5, 50]])
  assert.deepEqual(tr.points(5, 10, 0, 100, 100, 100).filter((_, k) => k % 2 === 1), [70, 60, 50]) // 30, 40, 50 -> y from the top
})

test('only the time window is drawn, left to right, with gain and offset', () => {
  const tr = new Trace(10)
  for (let i = 0; i <= 4; i++) tr.push(i, 50)
  const pts = tr.points(4, 2, 0, 100, 200, 100, 2, -50) // t 2..4; 50 * 2 - 50 = 50
  assert.deepEqual(pts, [0, 50, 100, 50, 200, 50])
})

test('y ranges from the legacy choices, 0-100 otherwise', () => {
  assert.deepEqual(yRange('-50-150'), [-50, 150])
  assert.deepEqual(yRange('-100-100'), [-100, 100])
  assert.deepEqual(yRange('nonsense'), [0, 100])
  assert.deepEqual(yRange(undefined), [0, 100])
})
