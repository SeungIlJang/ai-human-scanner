import test from 'node:test'
import assert from 'node:assert/strict'
import { createPhysiognomyScores, scoredTraits } from '../src/services/physiognomyScore.js'
import config from '../src/data/score-config.json' with { type: 'json' }
import rules from '../src/data/physiognomy-rules.json' with { type: 'json' }

const limits = Object.fromEntries(config.scores.map(item => [item.key, item]))
const metricKeys = [...new Set(rules.rules.flatMap(rule => rule.sections ?? [rule.metric]))]
const reference = Object.fromEntries(rules.rules.flatMap(rule =>
  rule.sections ? rule.sections.map(key => [key, rule.sectionScales[key][0]]) : [[rule.metric, rule.center]]))
const score = metrics => createPhysiognomyScores([{ metrics }])
const value = (result, label) => result.highlights.find(item => item.label === label).value
const extra = (result, key) => result.additional.find(item => item.key === key).value

test('the reference face reads as standard everywhere and scores the base values', () => {
  const result = score(reference)
  assert.deepEqual(result.readings.filter(item => item.key !== 'thirdsBalance').map(item => item.band),
    Array(rules.rules.length - 1).fill('mid'))
  // Three sections that all match the reference are as balanced as the rule can express.
  assert.equal(result.readings.find(item => item.key === 'thirdsBalance').band, 'high')
  assert.ok(Math.abs(value(result, '인성 점수') - rules.base.kindness) <= 5)
})

test('each reading follows what the classical passage says about that feature', () => {
  const base = score(reference)
  // 上下俱薄者，妄語: thin lips raise the lie count; thick lips lower it.
  const thinLips = score({ ...reference, lipThickness: 15 })
  const thickLips = score({ ...reference, lipThickness: 42 })
  assert.ok(value(thinLips, '거짓말 횟수') > value(base, '거짓말 횟수'))
  assert.ok(value(thickLips, '거짓말 횟수') < value(base, '거짓말 횟수'))
  assert.equal(thinLips.readings.find(item => item.key === 'lipThickness').quote, '上下俱薄者，妄語')
  // 準頭豐大與人無害 / 準頭尖細好為奸計
  const fullNose = score({ ...reference, noseWidth: 27 })
  const thinNose = score({ ...reference, noseWidth: 16 })
  assert.ok(value(fullNose, '인성 점수') > value(base, '인성 점수'))
  assert.ok(value(thinNose, '잔머리 지수') > value(base, '잔머리 지수'))
  // 中停短促褊塌者，主不仁不義
  assert.ok(value(score({ ...reference, midFace: 35 }), '인성 점수') < value(base, '인성 점수'))
  // 眉長過目，忠直有祿
  assert.ok(extra(score({ ...reference, browLength: 200 }), 'loyalty') > extra(base, 'loyalty'))
  // 昂者氣剛
  assert.ok(extra(score({ ...reference, browTilt: -3 }), 'stubborn') > extra(base, 'stubborn'))
})

test('different faces get visibly different results', () => {
  const round = score({ ...reference, noseWidth: 26, lipThickness: 40, browGap: 26, midFace: 44, lowerFace: 37.3, mouthTilt: 6 })
  const sharp = score({ ...reference, noseWidth: 17, lipThickness: 17, browGap: 16, midFace: 37, lowerFace: 44.3, browTilt: -5, eyeTilt: 7 })
  assert.ok(value(round, '인성 점수') - value(sharp, '인성 점수') >= 20)
  assert.ok(value(sharp, '거짓말 횟수') - value(round, '거짓말 횟수') >= 300)
  assert.notEqual(value(round, '동물 유형'), value(sharp, '동물 유형'))
  const extras = result => result.additional.slice(1).map(item => item.value)
  assert.ok(new Set(extras(sharp)).size >= 6, 'extra scores must not collapse into a few shared values')
})

test('a small measurement change moves scores gradually', () => {
  const baseline = score({ ...reference, noseWidth: 23 })
  const changed = score({ ...reference, noseWidth: 23.1, lowerFace: 40.8 })
  for (const label of ['인성 점수', '못된 점수', '잔머리 지수']) {
    assert.ok(Math.abs(value(baseline, label) - value(changed, label)) <= 1, label)
  }
  assert.ok(Math.abs(value(baseline, '거짓말 횟수') - value(changed, '거짓말 횟수')) <= 5)
})

test('every metric combination, including extreme ratios, yields displayable scores', () => {
  let state = 1
  const random = () => (state = (state * 48271) % 2147483647) / 2147483647
  for (let run = 0; run < 500; run++) {
    // Go far beyond plausible faces so that clamping is exercised.
    const metrics = Object.fromEntries(metricKeys.map(key => [key, run < 2 ? [-40, 300][run] : -30 + random() * 230]))
    const result = score(metrics)
    assert.deepEqual(result, score(metrics))
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
    for (const reading of result.readings) assert.ok(reading.reading && reading.measurement, reading.key)
  }
})

test('the rule file is complete: every band has a reading and every score has a rule behind it', () => {
  for (const rule of rules.rules) {
    for (const band of ['high', 'mid', 'low']) assert.ok(rule[band].reading.length > 10, `${rule.key} ${band}`)
    for (const band of ['high', 'low']) {
      assert.ok(rule[band].label, `${rule.key} ${band} label`)
      if (rule[band].quote) assert.ok(rules.source.volumes[rule[band].volume] && rule[band].section, `${rule.key} ${band} reference`)
    }
    assert.ok(rule.span > 0, rule.key)
    for (const trait of Object.keys(rule.traits)) assert.ok(scoredTraits.includes(trait), `${rule.key} ${trait}`)
  }
  for (const trait of scoredTraits) {
    assert.ok(rules.rules.filter(rule => trait in rule.traits).length >= 2, `${trait} needs at least two rules`)
  }
  const named = [...rules.animals.flatMap(item => item.traits), ...rules.jobs.map(item => item.trait)]
  for (const trait of named) assert.ok(scoredTraits.includes(trait), trait)
})

test('a missing required measurement gives no score', () => {
  const { noseWidth, ...rest } = reference
  assert.equal(score(rest), null)
  const { symmetry, ...withoutBalance } = reference
  assert.ok(score(withoutBalance))
})
