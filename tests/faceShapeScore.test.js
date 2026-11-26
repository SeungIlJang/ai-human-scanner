import test from 'node:test'
import assert from 'node:assert/strict'
import { measureFaceShape } from '../src/services/faceShapeScore.js'
import { createPhysiognomyScores } from '../src/services/physiognomyScore.js'

const points = []
for (const [index, x, y] of [
  [10, .5, .2], [152, .5, .8], [234, .25, .5], [454, .75, .5],
  [33, .31, .4], [133, .43, .4], [263, .69, .4], [362, .57, .4],
  [1, .5, .52], [61, .39, .66], [291, .61, .66]
]) points[index] = { x, y }

test('face scores reflect landmark geometry, with image aspect ratio accounted for', () => {
  const balanced = measureFaceShape(points, 1.2)
  assert.equal(balanced.total, 100)
  assert.equal(balanced.widthToHeight, 100)
  assert.equal(balanced.eyeGapToWidth, 28)
  const changed = points.slice()
  changed[263] = { x: .63, y: .4 }
  const different = measureFaceShape(changed, 1.2)
  assert.equal(different.scores[0].value, 50)
  assert.equal(different.total, 83)
})

test('the same geometry scores the same after mirroring, zooming or translation', () => {
  const reframed = points.map(({ x, y }) => ({ x: .8 - x * .6, y: .1 + y * .6 }))
  assert.deepEqual(measureFaceShape(reframed, 1.2), measureFaceShape(points, 1.2))
})

test('missing measurements do not produce an invented score', () => {
  assert.equal(measureFaceShape([], 1), null)
  assert.equal(measureFaceShape(points, 0), null)
})

test('the four entertainment scores use the measured face and are repeatable', () => {
  const result = createPhysiognomyScores(measureFaceShape(points, 1.2))
  assert.deepEqual(createPhysiognomyScores(measureFaceShape(points, 1.2)), result)
  const modified = points.slice()
  modified[263] = { x: .63, y: .4 }
  const different = createPhysiognomyScores(measureFaceShape(modified, 1.2))
  assert.notDeepEqual(different, result)
  assert.deepEqual(result.map(item => [item.label, item.unit]), [
    ['인성 점수', '점'], ['거짓말 횟수', '회'], ['못된 짓 횟수', '회'], ['바람둥이 지수', '점']
  ])
  assert.ok(result[2].value >= 0 && result[2].value <= 300)
  assert.equal(createPhysiognomyScores(null), null)
})
