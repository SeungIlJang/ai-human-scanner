import test from 'node:test'
import assert from 'node:assert/strict'
import { createPhysiognomyScores } from '../src/services/physiognomyScore.js'
import config from '../src/data/score-config.json' with { type: 'json' }
import traditions from '../src/data/physiognomy-sources.json' with { type: 'json' }

const keys = traditions.concepts.flatMap(concept => concept.measurements.map(item => item.key))
const limits = Object.fromEntries(config.scores.map(item => [item.key, item]))

test('every metric combination, including extreme ratios, yields displayable scores', () => {
  let state = 1
  const random = () => (state = (state * 48271) % 2147483647) / 2147483647
  for (let run = 0; run < 500; run++) {
    // Go far beyond plausible faces so that clamping is exercised.
    const metrics = Object.fromEntries(keys.map(key => [key, run < 2 ? [.1, 300][run] : .1 + random() * 150]))
    const result = createPhysiognomyScores([{ metrics }])
    assert.deepEqual(result, createPhysiognomyScores([{ metrics }]))
    assert.equal(result.highlights.length, 6)
    for (const item of result.highlights) {
      if (item.unit === '점') assert.ok(Number.isInteger(item.value) && item.value >= 0 && item.value <= 100, `${item.label} ${item.value}`)
      else if (item.unit === '회') assert.ok(Number.isInteger(item.value) && item.value >= 0, `${item.label} ${item.value}`)
      else assert.ok(item.value, item.label)
    }
    for (const item of result.additional) {
      if (item.key === 'mischiefCount') assert.ok(Number.isInteger(item.value) && item.value >= 0)
      else assert.ok(item.value >= limits[item.key].min && item.value <= limits[item.key].max, `${item.key} ${item.value}`)
    }
  }
})

test('every measurement that a tradition selects has a scoring scale', () => {
  for (const key of keys) {
    const metrics = Object.fromEntries(keys.map(other => [other, 40]))
    assert.doesNotThrow(() => createPhysiognomyScores([{ metrics: { ...metrics, [key]: 60 } }]), key)
  }
})
