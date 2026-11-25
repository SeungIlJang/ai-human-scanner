import config from '../data/score-config.json' with { type: 'json' }
import characters from '../data/character-types.json' with { type: 'json' }

export function makeSeed() { const bytes = new Uint32Array(1); crypto.getRandomValues(bytes); return bytes[0] }
export function randomFromSeed(seed) { let state = seed >>> 0; return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const clamp = (n, min, max) => Math.max(min, Math.min(max, Math.round(n)))
export function createScores(seed, settings = config) {
  const random = randomFromSeed(seed)
  const scores = {}
  for (const item of settings.scores) {
    // A broad distribution avoids a persistent cluster around 50.
    const base = (random() * .75 + random() * .25) * 100
    scores[item.key] = clamp(base, item.min, item.max)
  }
  if (scores.kindness != null && scores.mischief != null) scores.mischief = clamp(75 - scores.kindness * .52 + (random() - .5) * 48, settings.scores.find(x => x.key === 'mischief').min, settings.scores.find(x => x.key === 'mischief').max)
  if (scores.humor != null && scores.playful != null) scores.playful = clamp(scores.humor * .55 + random() * 45, settings.scores.find(x => x.key === 'playful').min, settings.scores.find(x => x.key === 'playful').max)
  const weighted = settings.scores.reduce((sum, item) => sum + scores[item.key] * item.weight, 0) / settings.scores.reduce((sum, item) => sum + item.weight, 0)
  const total = Math.round(weighted)
  return { seed, scores, total, grade: settings.grades.find(g => total >= g.min).grade, lieCount: Math.floor(random() * (settings.lieCount.max + 1)), job: characters.jobs[Math.floor(random() * characters.jobs.length)], title: characters.titles[Math.floor(random() * characters.titles.length)] }
}
export { config }
