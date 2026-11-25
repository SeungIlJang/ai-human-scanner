import test from 'node:test'
import assert from 'node:assert/strict'
import { createScores, config } from '../src/services/scoreEngine.js'
import { band, describe } from '../src/services/descriptionEngine.js'
import descriptions from '../src/data/descriptions.json' with { type: 'json' }

test('same seed yields identical result and all scores stay in configured ranges', () => {
  for (let seed = 0; seed < 500; seed++) {
    const result = createScores(seed)
    assert.deepEqual(result, createScores(seed))
    for (const item of config.scores) assert.ok(result.scores[item.key] >= item.min && result.scores[item.key] <= item.max, item.key)
    assert.ok(result.lieCount >= 0 && result.lieCount <= 5000)
    assert.ok(['S','A','B','C','D'].includes(result.grade))
  }
})
test('every score and interval has at least ten descriptions', () => {
  for (const item of config.scores) for (const phrases of descriptions[item.key]) assert.ok(phrases.length >= 10, item.key)
  assert.deepEqual([0,20,21,40,41,60,61,80,81,100].map(band), [0,0,1,1,2,2,3,3,4,4])
  assert.equal(describe(createScores(1),'humor'), describe(createScores(1),'humor'))
})
