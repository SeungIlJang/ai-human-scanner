import test from 'node:test'
import assert from 'node:assert/strict'
import { createCoverProjection, frameFacePhoto } from '../src/utils/faceProjection.js'

test('landmarks follow a centered cover crop', () => {
  // A 4:3 camera frame fills a portrait viewport by cropping both sides.
  const project = createCoverProjection(640, 480, 180, 225)
  assert.deepEqual(project({ x: .5, y: .5 }), { x: 90, y: 112.5 })
  assert.deepEqual(project({ x: .2, y: .5 }), { x: 0, y: 112.5 })
})

test('front-camera mirroring flips only the horizontal landmark position', () => {
  const normal = createCoverProjection(640, 480, 180, 225)
  const mirrored = createCoverProjection(640, 480, 180, 225, true)
  assert.deepEqual(mirrored({ x: .2, y: .5 }), { x: 180, y: 112.5 })
  assert.equal(normal({ x: .5, y: .2 }).y, mirrored({ x: .5, y: .2 }).y)
})

test('the result centers an off-center face and projects points into the same photo rectangle', () => {
  const topLeft = { x: .58, y: .22 }
  const bottomRight = { x: .94, y: .82 }
  for (const [width, height] of [[320, 300], [620, 385]]) {
    const crop = frameFacePhoto([topLeft, bottomRight], 720, 1280, width, height)
    const a = crop.project(topLeft)
    const b = crop.project(bottomRight)
    assert.ok(Math.abs((a.x + b.x) / 2 - width / 2) < 1e-9)
    assert.ok(Math.abs((a.y + b.y) / 2 - height / 2) < 1e-9)
    assert.ok(a.x > 0 && b.x < width && a.y > 0 && b.y < height)
    assert.deepEqual(crop.project({ x: 0, y: 0 }), { x: crop.x, y: crop.y })
    assert.deepEqual(crop.project({ x: 1, y: 1 }), { x: crop.x + crop.width, y: crop.y + crop.height })
  }
})
