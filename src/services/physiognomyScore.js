import config from '../data/score-config.json' with { type: 'json' }
import traditions from '../data/physiognomy-sources.json' with { type: 'json' }

const extraScores = config.scores.filter(({ key }) =>
  !['kindness', 'mischief', 'wit', 'flirt'].includes(key)
)
// Game reference points and spans in percentage points, not population norms.
const scales = {
  browGap: [20, 16], eyeGap: [27, 18], noseWidth: [30, 20], mouthWidth: [51, 26],
  upperFace: [27, 16], midFace: [34, 24], lowerFace: [39, 30],
  foreheadWidth: [75, 28], cheekWidth: [82, 34], jawWidth: [76, 28], noseLength: [26, 20]
}

const profiles = [
  { job: '약초 정원사', animal: '사슴형' },
  { job: '지도 제작자', animal: '여우형' },
  { job: '도서관 사서', animal: '부엉이형' },
  { job: '공방 장인', animal: '수달형' },
  { job: '여행 상인', animal: '고양이형' }
]
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export function createPhysiognomyScores(groups, concepts = traditions.concepts) {
  if (!groups || !concepts.length) return null
  const measuredValues = Object.assign({}, ...groups.map(group => group.metrics))
  const basis = concepts.map(({ key, title, source, measurements }) => ({
    key, title, source,
    measurements: measurements.map(({ key, label }) => ({ key, label, value: measuredValues[key] }))
  }))
  if (basis.some(group => group.measurements.some(item => !Number.isFinite(item.value) || item.value <= 0))) return null

  // Change points gradually as ratios move. Do not hash a small difference into a new score.
  const groupScores = Object.fromEntries(basis.map(group => {
    const sum = group.measurements.reduce((total, item) => {
      const [center, span] = scales[item.key]
      return total + clamp((item.value - center) / span, -1, 1)
    }, 0)
    return [group.key, sum / group.measurements.length]
  }))
  const features = groupScores['five-features']
  const thirds = groupScores['three-sections']
  const contour = groupScores['five-mountains']
  const kindness = Math.round(62 + 24 * (.40 * features - .20 * thirds + .40 * contour))
  const mischief = Math.round(48 + 28 * (.55 * features + .20 * thirds - .25 * contour))
  const wit = Math.round(57 + 27 * (.35 * features - .30 * thirds + .35 * contour))
  const lieCount = Math.round(1200 + 450 * (.45 * features - .20 * thirds + .35 * contour))
  const profileIndex = [-.33, -.14, .14, .33].filter(boundary =>
    .55 * features + .15 * thirds + .30 * contour >= boundary
  ).length
  const profile = profiles[profileIndex]
  const mixes = [.60 * features - .25 * thirds + .15 * contour, .30 * features + .35 * thirds - .35 * contour,
    -.20 * features + .20 * thirds + .60 * contour, .30 * features - .30 * thirds + .40 * contour]
  return {
    basis,
    highlights: [
      { label: '인성 점수', value: kindness, unit: '점' },
      { label: '거짓말 횟수', value: lieCount, unit: '회' },
      { label: '못된 점수', value: mischief, unit: '점' },
      { label: '잔머리 지수', value: wit, unit: '점' },
      { label: '전생 직업', value: profile.job },
      { label: '동물 유형', value: profile.animal }
    ],
    additional: [
      { key: 'mischiefCount', label: '못된 짓 횟수', value: 3 * mischief, unit: '회' },
      ...extraScores.map(({ key, label, min, max }, index) => ({
        key, label, unit: '점', value: clamp(Math.round(52 + 24 * mixes[index % mixes.length]), min, max)
      }))
    ]
  }
}
