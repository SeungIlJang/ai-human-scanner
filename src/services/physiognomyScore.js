import config from '../data/score-config.json' with { type: 'json' }
import ruleData from '../data/physiognomy-rules.json' with { type: 'json' }

const mainTraits = ['kindness', 'mischief', 'wit', 'lies']
export const extraScores = config.scores.filter(({ key }) => !['kindness', 'mischief', 'wit', 'flirt'].includes(key))
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

// Position of a measurement between the rule's reference point (0) and the end of its span (±1).
function position(rule, metrics) {
  if (rule.sections) {
    const offsets = rule.sections.map(key => {
      const [center, span] = rule.sectionScales[key]
      return Number.isFinite(metrics[key]) ? clamp(Math.abs(metrics[key] - center) / span, 0, 1) : NaN
    })
    // All three sections at their reference gives +1. An average offset of a full span gives -1.
    return 1 - 2 * offsets.reduce((sum, offset) => sum + offset, 0) / offsets.length
  }
  const value = metrics[rule.metric]
  return Number.isFinite(value) ? clamp((value - rule.center) / rule.span, -1, 1) : NaN
}

function measurementText(rule, metrics) {
  if (rule.sections) return `${rule.label} ${rule.sections.map(key => `${metrics[key]}%`).join(' / ')}`
  return `${rule.label} ${metrics[rule.metric]}${rule.unit}`
}

const cite = (data, entry) => entry?.quote ? {
  quote: entry.quote,
  reference: `${data.source.title} 권${entry.volume} 〈${entry.section}〉`,
  url: data.source.volumes[entry.volume]
} : {}

// The builders below turn keys into what the result screen shows. A shared link carries only those keys,
// so the screen of the person who opens it is built by the same code as the original.
export function readingFor(data, rule, band, strength, measurement) {
  const entry = rule[band]
  return {
    key: rule.key, part: rule.part, title: rule.title, band,
    bandLabel: entry.label ?? '표준에 가까움',
    measurement,
    reading: entry.reading,
    quote: entry.quote,
    reference: entry.quote ? `${data.source.title} 권${entry.volume} 〈${entry.section}〉` : undefined,
    url: entry.quote ? data.source.volumes[entry.volume] : undefined,
    strength
  }
}

export const fortuneKinds = data => [...data.fortunes.items, data.fortunes.balanced, data.fortunes.king]

export function fortuneFor(data, key, featureKeys, supportKey) {
  const rules = Object.fromEntries(data.rules.map(rule => [rule.key, rule]))
  const kind = fortuneKinds(data).find(item => item.key === key)
  return {
    key, name: kind.name, emoji: kind.emoji, title: kind.title, reading: kind.reading,
    features: featureKeys.map(feature => rules[feature].title), featureKeys, supportKey,
    ...cite(data, rules[supportKey].high)
  }
}

export function cautionFor(data, ruleKey) {
  const rule = data.rules.find(item => item.key === ruleKey)
  if (!rule) return { key: 'none', name: data.fortunes.noCaution.name, reading: data.fortunes.noCaution.reading }
  return { key: rule.key, name: rule.caution.name, reading: rule.caution.reading, ...cite(data, rule[rule.caution.band]) }
}

// Grades are listed from the highest threshold down.
export const gradeFor = (data, kindness) => data.grades.find(item => kindness >= item.min)

export function resultFrom(data, { readings, fortune, caution, kindness, lies, mischief, wit, job, animal, extras }) {
  return {
    readings, fortune, caution,
    grade: gradeFor(data, kindness),
    highlights: [
      { label: '인성 점수', value: kindness, unit: '점' },
      { label: '거짓말 횟수', value: lies, unit: '회' },
      { label: '못된 점수', value: mischief, unit: '점' },
      { label: '잔머리 지수', value: wit, unit: '점' },
      { label: '전생 직업', value: job },
      { label: '동물 유형', value: animal }
    ],
    additional: [
      { key: 'mischiefCount', label: '못된 짓 횟수', value: 3 * mischief, unit: '회' },
      ...extraScores.map(({ key, label }, index) => ({ key, label, unit: '점', value: extras[index] }))
    ]
  }
}

// The single best fortune and the single thing to watch. Which features count toward which fortune, and the
// "king" title, are this app's own game rules; the passage shown with each comes from the classical text.
function pickFortune(data, positions) {
  const { items, balanced, king, minimum, noCaution } = data.fortunes
  // A fortune's score is the average position of its features, so one unfavorable feature pulls it down.
  const score = item => item.rules.reduce((sum, key) => sum + positions[key], 0) / item.rules.length
  const scores = Object.fromEntries(items.map(item => [item.key, score(item)]))
  let best = items.reduce((top, item) => scores[item.key] > scores[top.key] ? item : top)
  if (king.requires.every(key => scores[key] >= king.minimum)) best = { ...king, rules: king.requires.flatMap(key => items.find(item => item.key === key).rules) }
  // No fortune stands out on a face close to the reference. The text praises exactly that evenness.
  else if (scores[best.key] < minimum) best = balanced
  const support = best.rules.reduce((top, key) => positions[key] > positions[top] ? key : top)
  // Name the features that actually stand out, since a fortune can win on one strong feature alone.
  // Listed in the order of the rule file, which is also the order a shared link restores.
  const standouts = data.rules.map(rule => rule.key).filter(key => best.rules.includes(key) && positions[key] >= data.threshold)

  // The feature that leans furthest in the direction the text warns about.
  const lean = rule => rule.caution.band === 'low' ? -positions[rule.key] : positions[rule.key]
  const worst = data.rules.filter(rule => rule.caution && rule.key in positions)
    .reduce((top, rule) => !top || lean(rule) > lean(top) ? rule : top, null)
  return {
    fortune: fortuneFor(data, best.key, standouts.length ? standouts : [support], support),
    caution: cautionFor(data, worst && lean(worst) >= noCaution.minimum ? worst.key : null)
  }
}

// The readings come from the classical text. Converting them to points is this app's own game rule.
export function createPhysiognomyScores(groups, data = ruleData) {
  if (!groups || !data.rules.length) return null
  const metrics = Object.assign({}, ...groups.map(group => group.metrics))
  const totals = {}
  const readings = []
  const positions = {}
  for (const rule of data.rules) {
    const at = position(rule, metrics)
    if (!Number.isFinite(at)) {
      if (rule.optional) continue
      return null
    }
    positions[rule.key] = at
    for (const [trait, weight] of Object.entries(rule.traits)) totals[trait] = (totals[trait] ?? 0) + at * weight
    const band = at >= data.threshold ? 'high' : at <= -data.threshold ? 'low' : 'mid'
    readings.push(readingFor(data, rule, band, Math.round(Math.abs(at) * 100), measurementText(rule, metrics)))
  }
  const total = trait => totals[trait] ?? 0
  const points = trait => clamp(Math.round(data.base[trait] + total(trait)), 0, 100)
  // Pick the type whose traits stand out most. Earlier entries win ties so the result is repeatable.
  const strongest = (items, score) => items.reduce((best, item) => score(item) > score(best) ? item : best)
  return resultFrom(data, {
    readings,
    ...pickFortune(data, positions),
    kindness: points('kindness'),
    lies: Math.max(0, Math.round(data.base.lies + total('lies'))),
    mischief: points('mischief'),
    wit: points('wit'),
    job: strongest(data.jobs, item => total(item.trait)).name,
    animal: strongest(data.animals, item => item.traits.reduce((sum, trait) => sum + total(trait), 0)).name,
    extras: extraScores.map(({ key, min, max }) => clamp(Math.round(data.base.extra + total(key)), min, max))
  })
}

export const scoredTraits = [...mainTraits, ...extraScores.map(item => item.key)]
