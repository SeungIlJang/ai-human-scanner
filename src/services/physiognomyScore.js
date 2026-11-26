import { config, createScores } from './scoreEngine.js'

const extraScores = config.scores.filter(({ key }) =>
  !['kindness', 'mischief', 'wit', 'flirt'].includes(key)
)

export function createPhysiognomyScores(shape) {
  if (!shape) return null
  const balances = new Map(shape.scores.map(item => [item.key, item.value]))
  const measurements = [
    balances.get('eyes'), shape.eyeGapToWidth,
    balances.get('cheeks'), shape.widthToHeight,
    balances.get('mouth'), shape.mouthToWidth
  ]
  if (!measurements.every(Number.isFinite)) return null

  // The measured geometry provides a repeatable seed for the entertainment scores.
  const seed = measurements.reduce((hash, value) => Math.imul(hash ^ value, 16777619), 2166136261) >>> 0
  const { scores, lieCount } = createScores(seed)
  return {
    highlights: [
      { label: '인성 점수', value: scores.kindness, unit: '점' },
      { label: '거짓말 횟수', value: lieCount, unit: '회' },
      { label: '못된 짓 횟수', value: 3 * scores.mischief, unit: '회' },
      { label: '잔머리 지수', value: scores.wit, unit: '점' }
    ],
    additional: extraScores.map(({ key, label }) => ({ key, label, value: scores[key] }))
  }
}
