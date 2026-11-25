import test from 'node:test'
import assert from 'node:assert/strict'
import { createCoverProjection } from '../src/utils/faceProjection.js'

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
