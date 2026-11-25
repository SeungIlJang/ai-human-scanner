import descriptions from '../data/descriptions.json' with { type: 'json' }
import { randomFromSeed } from './scoreEngine.js'

export function band(score) { return Math.min(4, Math.floor(Math.max(0, score - 1) / 20)) }
export function describe(result, key) {
  const options = descriptions[key]?.[band(result.scores[key])] || []
  return options[Math.floor(randomFromSeed(result.seed ^ hash(key))() * options.length)] || ''
}
function hash(value) { return [...value].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0 }
export function summary(result) {
  const top = Object.entries(result.scores).sort((a,b) => b[1]-a[1]).slice(0,3)
  return `${result.title}! ${top.map(([key]) => describe(result,key)).join(' ')} 전생에는 ${result.job}였을지도 몰라요.`
}
