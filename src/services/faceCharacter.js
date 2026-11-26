// These ranges are game rules. They are not population averages or personality measures.
const rules = [
  { label: '정밀', title: '별빛 정찰자', balance: 'eyes', ratio: 'eyeGapToWidth', ratioLabel: '눈 간격 / 얼굴 너비', min: 15, max: 36 },
  { label: '방어', title: '달빛 수호자', balance: 'cheeks', ratio: 'widthToHeight', ratioLabel: '얼굴 너비 / 높이', min: 60, max: 100 },
  { label: '마력', title: '메아리 마법사', balance: 'mouth', ratio: 'mouthToWidth', ratioLabel: '입 너비 / 얼굴 너비', min: 30, max: 60 }
]

export function createFaceCharacter(shape) {
  if (!shape) return null
  const balances = new Map(shape.scores.map(item => [item.key, item]))
  const stats = []
  for (const { label, title, balance, ratio, ratioLabel, min, max } of rules) {
    const measuredBalance = balances.get(balance)
    const measuredRatio = shape[ratio]
    if (!Number.isFinite(measuredBalance?.value) || !Number.isFinite(measuredRatio)) return null
    const ratioPoints = Math.round(Math.min(1, Math.max(0, (measuredRatio - min) / (max - min))) * 100)
    const value = Math.round(.6 * measuredBalance.value + .4 * ratioPoints)
    stats.push({ label, title, value, balance: measuredBalance.label, measuredBalance: measuredBalance.value, ratioLabel, measuredRatio, ratioPoints, min, max })
  }
  const specialty = stats.reduce((best, stat) => stat.value > best.value ? stat : best)
  const total = Math.round(stats.reduce((sum, stat) => sum + stat.value, 0) / stats.length)
  return { title: specialty.title, total, stats }
}
