import test from 'node:test'
import assert from 'node:assert/strict'
import { createPhysiognomyScores } from '../src/services/physiognomyScore.js'
import { decodeShare, encodeShare } from '../src/services/shareCode.js'
import rules from '../src/data/physiognomy-rules.json' with { type: 'json' }

const reference = Object.fromEntries(rules.rules.flatMap(rule =>
  rule.sections ? rule.sections.map(key => [key, rule.sectionScales[key][0]]) : [[rule.metric, rule.center]]))
const score = metrics => createPhysiognomyScores([{ metrics: { ...reference, ...metrics } }])
// What the person opening the link sees: everything except the measurement lines.
const shown = result => ({ ...result, readings: result.readings.map(reading => ({ ...reading, measurement: '' })) })

test('a shared link reproduces the whole result for varied faces', () => {
  let state = 7
  const random = () => (state = (state * 48271) % 2147483647) / 2147483647
  const faces = [{}, { lipThickness: 16, noseWidth: 17, eyeTilt: 7 }, { cheekWidth: 85, browTilt: -5, upperFace: 22.7, foreheadWidth: 81, eyeLength: 21.5, browGap: 27, mouthTilt: 7 }]
  for (let run = 0; run < 200; run++) {
    faces.push(Object.fromEntries(Object.entries(reference).map(([key, value]) => [key, value * (.7 + random() * .6) + (random() - .5) * 8])))
  }
  for (const face of faces) {
    const result = score(face)
    const code = encodeShare(result)
    assert.match(code, /^[A-Za-z0-9_-]+$/)
    assert.ok(code.length <= 80, `the link stays short: ${code.length}`)
    assert.deepEqual(decodeShare(code), shown(result))
  }
})

test('a result without the left-right balance reading survives sharing', () => {
  const { symmetry, ...rest } = reference
  const result = createPhysiognomyScores([{ metrics: rest }])
  const decoded = decodeShare(encodeShare(result))
  assert.equal(decoded.readings.length, rules.rules.length - 1)
  assert.deepEqual(decoded, shown(result))
})

test('the link carries no facial measurements', () => {
  const face = { lipThickness: 16.4, noseWidth: 17.3, browLength: 187 }
  const result = score(face)
  const decoded = decodeShare(encodeShare(result))
  assert.ok(result.readings.some(reading => reading.measurement.includes('16.4')))
  assert.ok(decoded.readings.every(reading => reading.measurement === ''))
  // Two faces that fall in the same bands with the same rounded strengths give the same link.
  assert.equal(encodeShare(score({ ...face, lipThickness: 16.2 })), encodeShare(result))
})

test('a broken, altered or foreign link gives nothing instead of a wrong result', () => {
  const code = encodeShare(score({ lipThickness: 16 }))
  assert.equal(decodeShare(''), null)
  assert.equal(decodeShare(undefined), null)
  assert.equal(decodeShare('<script>'), null)
  assert.equal(decodeShare(code.slice(0, -4)), null)
  assert.equal(decodeShare(code + 'AAAA'), null)
  assert.equal(decodeShare('B' + code.slice(1)), null, 'another format version')
  const bytes = Uint8Array.from(atob(code.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0))
  const altered = index => { const copy = [...bytes]; copy[index] = 250; return btoa(String.fromCharCode(...copy)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '') }
  for (const index of [1, 6, 7, 8, 9, 13]) assert.equal(decodeShare(altered(index)), null, `byte ${index}`)
})
