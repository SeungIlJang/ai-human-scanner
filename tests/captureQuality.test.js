import test from 'node:test'
import assert from 'node:assert/strict'
import { checkFacePixels, isFacingCamera } from '../src/utils/captureQuality.js'

test('frontal pose stays valid under scaling but a strong turn blocks automatic capture', () => {
  const frontal = { rows: 4, columns: 4, data: [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 1, 2, 3, 1] }
  const turned = { ...frontal, data: [1, 0, -1.73, 0, 0, 2, 0, 0, 1.73, 0, 1, 0, 1, 2, 3, 1] }
  assert.equal(isFacingCamera(frontal), true)
  assert.equal(isFacingCamera(turned), false)
  assert.equal(isFacingCamera(null), false)
})

test('capture quality distinguishes darkness and loss of detail from visible edges', () => {
  const size = 8
  const pixels = new Uint8ClampedArray(size * size * 4)
  assert.match(checkFacePixels(pixels, size, size), /빛/)
  pixels.fill(96)
  assert.match(checkFacePixels(pixels, size, size), /흐립/)
  for (let y = 0; y < size; y++) {
    for (let x = size / 2; x < size; x++) {
      const offset = (y * size + x) * 4
      pixels.fill(150, offset, offset + 3)
    }
  }
  assert.equal(checkFacePixels(pixels, size, size), '')
})
