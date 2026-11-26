import test from 'node:test'
import assert from 'node:assert/strict'
import { faceFraming, createAutoCaptureGate, hasClosedEye } from '../src/utils/autoCapture.js'

const centered = [{ x: .28, y: .25 }, { x: .72, y: .25 }, { x: .28, y: .75 }, { x: .72, y: .75 }]

test('auto capture requires a centered face fully inside the preview', () => {
  assert.equal(faceFraming(centered, 400, 500, 400, 500).ready, true)
  assert.equal(faceFraming(centered.map(p => ({ ...p, x: p.x + .28 })), 400, 500, 400, 500).ready, false)
  assert.equal(faceFraming(centered.map(p => ({ ...p, x: p.x * .3 })), 400, 500, 400, 500).ready, false)
})

test('framing guides users based on distance, clipping and whether a face is visible', () => {
  const guidance = points => faceFraming(points, 400, 500, 400, 500).message
  const scale = factor => centered.map(({ x, y }) => ({ x: .5 + (x - .5) * factor, y: .5 + (y - .5) * factor }))
  assert.match(guidance(scale(.4)), /가까이/)
  assert.match(guidance(scale(1.8)), /멀리/)
  assert.match(guidance(centered.map(point => ({ ...point, x: point.x + .3 }))), /중앙/)
  assert.match(guidance([]), /얼굴 전체/)
})

test('closed-eye guidance uses only the blink categories', () => {
  assert.equal(hasClosedEye([{ categoryName: 'eyeBlinkLeft', score: .9 }]), true)
  assert.equal(hasClosedEye([{ categoryName: 'eyeBlinkRight', score: .9 }]), true)
  assert.equal(hasClosedEye([{ categoryName: 'eyeBlinkLeft', score: .4 }, { categoryName: 'eyeLookDownRight', score: .9 }]), false)
  assert.equal(hasClosedEye(undefined), false)
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
  gate.update(face, 400)
  gate.update(face, 650)
  assert.equal(gate.update(shifted, 800), false)
})

test('an interrupted stream cannot satisfy the hold using stale samples', () => {
  const gate = createAutoCaptureGate(700, 4)
  const face = faceFraming(centered, 400, 500, 400, 500)
  for (const time of [100, 220, 350, 1000]) assert.equal(gate.update(face, time), false)
})
