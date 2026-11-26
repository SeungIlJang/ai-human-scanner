import test from 'node:test'
import assert from 'node:assert/strict'
import { measureFaceShape } from '../src/services/faceShapeScore.js'
import { measureFaceDetails } from '../src/services/faceMeasurements.js'
import { createPhysiognomyScores } from '../src/services/physiognomyScore.js'
import rules from '../src/data/physiognomy-rules.json' with { type: 'json' }

const points = []
for (const [index, x, y] of [
  [10, .5, .2], [152, .5, .8], [234, .25, .5], [454, .75, .5],
  [33, .31, .4], [133, .43, .4], [263, .69, .4], [362, .57, .4],
  [1, .5, .52], [61, .39, .66], [291, .61, .66],
  [107, .43, .36], [336, .57, .36], [98, .44, .55], [327, .56, .55],
  [9, .5, .4], [2, .5, .57], [168, .5, .43],
  [103, .29, .28], [332, .71, .28], [172, .33, .67], [397, .67, .67],
  [70, .27, .37], [300, .73, .37], [0, .5, .63], [13, .5, .655], [14, .5, .665], [17, .5, .7]
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

test('scores are repeatable and change when either the face or the rule set changes', () => {
  const groups = measureFaceDetails(points, 1.2, 100)
  const result = createPhysiognomyScores(groups)
  assert.deepEqual(createPhysiognomyScores(measureFaceDetails(points, 1.2, 100)), result)
  const modified = points.slice()
  modified[98] = { ...points[98], x: .4 }
  const different = createPhysiognomyScores(measureFaceDetails(modified, 1.2, 100))
  assert.notDeepEqual(different.highlights, result.highlights)
  assert.deepEqual(result.readings.map(item => item.key), rules.rules.map(rule => rule.key))
  const fewerRules = createPhysiognomyScores(groups, { ...rules, rules: rules.rules.filter(rule => rule.key !== 'noseWidth') })
  assert.notDeepEqual(fewerRules.highlights, result.highlights)
  delete modified[98]
  assert.equal(createPhysiognomyScores(measureFaceDetails(modified, 1.2, 100)), null)
  assert.deepEqual(result.highlights.map(item => [item.label, item.unit]), [
    ['인성 점수', '점'], ['거짓말 횟수', '회'], ['못된 점수', '점'], ['잔머리 지수', '점'],
    ['전생 직업', undefined], ['동물 유형', undefined]
  ])
  assert.ok(result.highlights[4].value.length > 0)
  assert.match(result.highlights[5].value, /형$/)
  assert.ok(result.highlights[2].value >= 0 && result.highlights[2].value <= 100)
  assert.deepEqual(result.additional[0], {
    key: 'mischiefCount', label: '못된 짓 횟수', value: 3 * result.highlights[2].value, unit: '회'
  })
  const additional = new Map(result.additional.map(item => [item.label, item.value]))
  assert.ok(additional.has('고집 지수') && additional.has('유머 지수'))
  assert.equal(additional.has('바람둥이 지수'), false)
  assert.ok(result.highlights.every(item => !additional.has(item.label)))
  assert.equal(createPhysiognomyScores(null), null)
})

test('the left-right balance rule is skipped, not invented, when the balance is unknown', () => {
  const withBalance = createPhysiognomyScores(measureFaceDetails(points, 1.2, 100))
  const without = createPhysiognomyScores(measureFaceDetails(points, 1.2))
  assert.ok(withBalance.readings.some(item => item.key === 'symmetry'))
  assert.ok(!without.readings.some(item => item.key === 'symmetry'))
  assert.equal(without.readings.length, withBalance.readings.length - 1)
})
