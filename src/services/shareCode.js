import ruleData from '../data/physiognomy-rules.json' with { type: 'json' }
import { cautionFor, extraScores, fortuneFor, fortuneKinds, readingFor, resultFrom } from './physiognomyScore.js'

// A shared link carries the result, not the face: scores, the chosen fortune and caution, and for each
// feature only which side of the reference it fell on and how far. No photo and no facial measurements.
const VERSION = 1
const HEADER = 14
const BANDS = ['mid', 'low', 'high']
const ABSENT = 3
const NONE = 255

const toBase64Url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
function fromBase64Url(code) {
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]+$/.test(code)) return null
  try { return Uint8Array.from(atob(code.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0)) } catch { return null }
}
const expectedLength = data => HEADER + Math.ceil(data.rules.length / 4) + data.rules.length + extraScores.length

export function encodeShare(scores, data = ruleData) {
  const value = label => scores.highlights.find(item => item.label === label).value
  const ruleIndex = key => data.rules.findIndex(rule => rule.key === key)
  const lies = Math.min(65535, value('거짓말 횟수'))
  const mask = scores.fortune.featureKeys.reduce((bits, key) => bits | 1 << ruleIndex(key), 0)
  const cautionIndex = ruleIndex(scores.caution.key)
  const bytes = [
    VERSION, value('인성 점수'), value('못된 점수'), value('잔머리 지수'), lies >> 8, lies & 255,
    data.jobs.findIndex(item => item.name === value('전생 직업')),
    data.animals.findIndex(item => item.name === value('동물 유형')),
    fortuneKinds(data).findIndex(item => item.key === scores.fortune.key),
    ruleIndex(scores.fortune.supportKey),
    mask & 255, mask >> 8 & 255, mask >> 16 & 255,
    cautionIndex < 0 ? NONE : cautionIndex
  ]
  const byKey = Object.fromEntries(scores.readings.map(reading => [reading.key, reading]))
  // Two bits per feature: standard, low side, high side, or not measured.
  const bands = new Array(Math.ceil(data.rules.length / 4)).fill(0)
  data.rules.forEach((rule, index) => {
    const reading = byKey[rule.key]
    bands[index >> 2] |= (reading ? BANDS.indexOf(reading.band) : ABSENT) << (index & 3) * 2
  })
  const strengths = data.rules.map(rule => byKey[rule.key]?.strength ?? 0)
  const extras = scores.additional.filter(item => item.key !== 'mischiefCount').map(item => item.value)
  return toBase64Url([...bytes, ...bands, ...strengths, ...extras])
}

// Returns the same shape as createPhysiognomyScores, or null for a link that is malformed or from another version.
export function decodeShare(code, data = ruleData) {
  const bytes = fromBase64Url(code)
  if (!bytes || bytes[0] !== VERSION || bytes.length !== expectedLength(data)) return null
  const [, kindness, mischief, wit, liesHigh, liesLow, jobIndex, animalIndex, fortuneIndex, supportIndex, mask0, mask1, mask2, cautionIndex] = bytes
  const kinds = fortuneKinds(data)
  const count = data.rules.length
  const job = data.jobs[jobIndex], animal = data.animals[animalIndex], kind = kinds[fortuneIndex], support = data.rules[supportIndex]
  if (!job || !animal || !kind || !support || [kindness, mischief, wit].some(points => points > 100)) return null
  if (cautionIndex !== NONE && !data.rules[cautionIndex]?.caution) return null

  const bandsAt = HEADER, strengthsAt = bandsAt + Math.ceil(count / 4), extrasAt = strengthsAt + count
  const readings = []
  for (let index = 0; index < count; index++) {
    const band = bytes[bandsAt + (index >> 2)] >> (index & 3) * 2 & 3
    const strength = bytes[strengthsAt + index]
    if (band === ABSENT) continue
    if (strength > 100) return null
    // The measurement itself is never shared, so that line stays empty.
    readings.push(readingFor(data, data.rules[index], BANDS[band], strength, ''))
  }
  if (!readings.length) return null
  const extras = [...bytes.slice(extrasAt)]
  if (extras.some(points => points > 100)) return null
  const mask = mask0 | mask1 << 8 | mask2 << 16
  const featureKeys = data.rules.filter((_, index) => mask >> index & 1).map(rule => rule.key)
  return resultFrom(data, {
    readings,
    fortune: fortuneFor(data, kind.key, featureKeys.length ? featureKeys : [support.key], support.key),
    caution: cautionFor(data, cautionIndex === NONE ? null : data.rules[cautionIndex].key),
    kindness, lies: liesHigh << 8 | liesLow, mischief, wit, job: job.name, animal: animal.name, extras
  })
}
