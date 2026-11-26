import { createScores } from './scoreEngine.js'

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
  return [
    { label: '인성 점수', value: scores.kindness, unit: '점' },
    { label: '거짓말 횟수', value: lieCount, unit: '회' },
    { label: '못된 짓 횟수', value: 3 * scores.mischief, unit: '회' },
    { label: '바람둥이 지수', value: scores.flirt, unit: '점' }
  ]
}
