import test from 'node:test'
import assert from 'node:assert/strict'
import { faceFraming, createAutoCaptureGate } from '../src/utils/autoCapture.js'

const centered = [{ x: .28, y: .25 }, { x: .72, y: .25 }, { x: .28, y: .75 }, { x: .72, y: .75 }]

test('auto capture requires a centered face fully inside the preview', () => {
  assert.equal(faceFraming(centered, 400, 500, 400, 500).ready, true)
  assert.equal(faceFraming(centered.map(p => ({ ...p, x: p.x + .28 })), 400, 500, 400, 500).ready, false)
  assert.equal(faceFraming(centered.map(p => ({ ...p, x: p.x * .3 })), 400, 500, 400, 500).ready, false)
})

test('auto capture waits for stable samples and resets when face disappears', () => {
  const gate = createAutoCaptureGate(700, 4)
  const face = faceFraming(centered, 400, 500, 400, 500)
  assert.equal(gate.update(face, 100), false)
  assert.equal(gate.update(face, 300), false)
  assert.equal(gate.update(face, 600), false)
  assert.equal(gate.update(face, 800), true)
  assert.equal(gate.update({ ready: false }, 900), false)
  assert.equal(gate.update(face, 1000), false)
})

test('auto capture restarts its hold when face moves abruptly', () => {
  const gate = createAutoCaptureGate(700, 3)
  const face = faceFraming(centered, 400, 500, 400, 500)
  const shifted = { ...face, box: { ...face.box, x: face.box.x + .08 } }
  gate.update(face, 100)
  gate.update(face, 600)
  assert.equal(gate.update(shifted, 900), false)
})
