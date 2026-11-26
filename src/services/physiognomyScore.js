import { config, createScores, randomFromSeed } from './scoreEngine.js'
import traditions from '../data/physiognomy-sources.json' with { type: 'json' }

const extraScores = config.scores.filter(({ key }) =>
  !['kindness', 'mischief', 'wit', 'flirt'].includes(key)
)
const animalTypes = ['고양이형', '여우형', '토끼형', '사슴형', '수달형', '부엉이형', '늑대형', '호랑이형']

export function createPhysiognomyScores(groups, concepts = traditions.concepts) {
  if (!groups || !concepts.length) return null
  const measuredValues = Object.assign({}, ...groups.map(group => group.metrics))
  const basis = concepts.map(({ key, title, source, measurements }) => ({
    key, title, source,
    measurements: measurements.map(({ key, label }) => ({ key, label, value: measuredValues[key] }))
  }))
  if (basis.some(group => group.measurements.some(item => !Number.isFinite(item.value) || item.value <= 0))) return null

  // The traditional categories select inputs. The entertainment scoring rule is app-defined.
  const inputs = JSON.stringify(basis.map(group => [
    group.key, ...group.measurements.map(item => [item.key, item.value])
  ]))
  let seed = 2166136261
  for (let i = 0; i < inputs.length; i++) seed = Math.imul(seed ^ inputs.charCodeAt(i), 16777619)
  const { scores, lieCount, job } = createScores(seed)
  const animalIndex = Math.floor(randomFromSeed(seed ^ 0x6e1ca7)() * animalTypes.length)
  return {
    basis,
    highlights: [
      { label: '인성 점수', value: scores.kindness, unit: '점' },
      { label: '거짓말 횟수', value: lieCount, unit: '회' },
      { label: '못된 점수', value: scores.mischief, unit: '점' },
      { label: '잔머리 지수', value: scores.wit, unit: '점' },
      { label: '전생 직업', value: job },
      { label: '동물 유형', value: animalTypes[animalIndex] }
    ],
    additional: [
      { key: 'mischiefCount', label: '못된 짓 횟수', value: 3 * scores.mischief, unit: '회' },
      ...extraScores.map(({ key, label }) => ({ key, label, value: scores[key], unit: '점' }))
    ]
  }
}
