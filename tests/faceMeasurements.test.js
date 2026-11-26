import test from 'node:test'
import assert from 'node:assert/strict'
import { measureFaceDetails } from '../src/services/faceMeasurements.js'

const points = []
for (const [index, x, y] of [
  [10, .5, .2], [152, .5, .8], [234, .24, .47], [454, .76, .47],
  [33, .31, .42], [133, .43, .42], [263, .69, .42], [362, .57, .42],
  [103, .28, .28], [332, .72, .28], [172, .34, .68], [397, .66, .68],
  [9, .5, .4], [2, .5, .6], [98, .44, .59], [327, .56, .59],
  [127, .24, .36], [356, .76, .36]
]) points[index] = { x, y, z: [234, 454].includes(index) ? -.05 : 0 }

test('the nine measurement groups include contour, thirds, and relative cheek depth', () => {
  const result = measureFaceDetails(points, 1, 90)
  assert.equal(result.length, 9)
  assert.equal(result[0].rows[0].value, '역삼각형')
  assert.equal(result[7].rows[1].value, '10%')
  assert.equal(result[8].rows[0].value, '33.3% / 33.3% / 33.3%')
  assert.equal(result[8].rows[1].value, '90점')
  assert.equal(result[4].rows[0].value, '측정할 수 없음')
})

test('tilting or mirroring the photo preserves the same measurements', () => {
  const angle = .25
  const tilted = points.map(({ x, y, z }) => ({
    x: .5 - ((x - .5) * Math.cos(angle) - (y - .5) * Math.sin(angle)),
    y: .5 + (x - .5) * Math.sin(angle) + (y - .5) * Math.cos(angle),
    z
  }))
  assert.deepEqual(measureFaceDetails(tilted, 1, 90), measureFaceDetails(points, 1, 90))
  assert.equal(measureFaceDetails([], 1), null)
})

test('the nose explanation changes when its width changes relative to the eye gap', () => {
  const nose = landmarks => measureFaceDetails(landmarks, 1, 90).find(group => group.title === '코').interpretation
  assert.match(nose(points).measurement, /23%.*27%/)
  assert.match(nose(points).impression, /좁아서/)

  const wider = points.slice()
  wider[98] = { ...points[98], x: .39 }
  wider[327] = { ...points[327], x: .61 }
  assert.match(nose(wider).impression, /넓어서/)
  assert.equal(nose(wider).source, 'aksFace')
  delete wider[98]
  assert.equal(nose(wider), null)
})
