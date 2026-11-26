import config from '../data/score-config.json' with { type: 'json' }
import ruleData from '../data/physiognomy-rules.json' with { type: 'json' }

const mainTraits = ['kindness', 'mischief', 'wit', 'lies']
const extraScores = config.scores.filter(({ key }) => !['kindness', 'mischief', 'wit', 'flirt'].includes(key))
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

// The readings come from the classical text. Converting them to points is this app's own game rule.
export function createPhysiognomyScores(groups, data = ruleData) {
  if (!groups || !data.rules.length) return null
  const metrics = Object.assign({}, ...groups.map(group => group.metrics))
  const totals = {}
  const readings = []
  for (const rule of data.rules) {
    const at = position(rule, metrics)
    if (!Number.isFinite(at)) {
      if (rule.optional) continue
      return null
    }
    for (const [trait, weight] of Object.entries(rule.traits)) totals[trait] = (totals[trait] ?? 0) + at * weight
    const band = at >= data.threshold ? 'high' : at <= -data.threshold ? 'low' : 'mid'
    const entry = rule[band]
    readings.push({
      key: rule.key, part: rule.part, title: rule.title, band,
      bandLabel: entry.label ?? '표준에 가까움',
      measurement: measurementText(rule, metrics),
      reading: entry.reading,
      quote: entry.quote,
      reference: entry.quote ? `${data.source.title} 권${entry.volume} 〈${entry.section}〉` : undefined,
      url: entry.quote ? data.source.volumes[entry.volume] : undefined,
      strength: Math.round(Math.abs(at) * 100)
    })
  }
  const total = trait => totals[trait] ?? 0
  const points = trait => clamp(Math.round(data.base[trait] + total(trait)), 0, 100)
  const mischief = points('mischief')
  // Pick the type whose traits stand out most. Earlier entries win ties so the result is repeatable.
  const strongest = (items, score) => items.reduce((best, item) => score(item) > score(best) ? item : best)
  const animal = strongest(data.animals, item => item.traits.reduce((sum, trait) => sum + total(trait), 0))
  const job = strongest(data.jobs, item => total(item.trait))
  return {
    readings,
    highlights: [
      { label: '인성 점수', value: points('kindness'), unit: '점' },
      { label: '거짓말 횟수', value: Math.max(0, Math.round(data.base.lies + total('lies'))), unit: '회' },
      { label: '못된 점수', value: mischief, unit: '점' },
      { label: '잔머리 지수', value: points('wit'), unit: '점' },
      { label: '전생 직업', value: job.name },
      { label: '동물 유형', value: animal.name }
    ],
    additional: [
      { key: 'mischiefCount', label: '못된 짓 횟수', value: 3 * mischief, unit: '회' },
      ...extraScores.map(({ key, label, min, max }) => ({
        key, label, unit: '점', value: clamp(Math.round(data.base.extra + total(key)), min, max)
      }))
    ]
  }
}

export const scoredTraits = [...mainTraits, ...extraScores.map(item => item.key)]
