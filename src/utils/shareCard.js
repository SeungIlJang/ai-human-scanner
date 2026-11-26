// Draws the result as an image for chats that show pictures better than text. It contains no photo.
const FONT = "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif"
const BACKGROUND = '#0a0f1c'

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}

function face(context, x, y, r, color, smile) {
  context.fillStyle = color
  context.beginPath()
  context.arc(x, y, r, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = BACKGROUND
  context.lineWidth = r * .14
  context.lineCap = 'round'
  for (const side of [-1, 1]) {
    context.beginPath()
    if (smile) context.arc(x + side * r * .38, y - r * .02, r * .2, Math.PI * 1.15, Math.PI * 1.85)
    else context.arc(x + side * r * .38, y - r * .05, r * .07, 0, Math.PI * 2)
    context.stroke()
  }
  context.beginPath()
  context.arc(x, y + r * .1, r * .45, Math.PI * .15, Math.PI * .85)
  context.stroke()
}

// A half-circle gauge from the lowest grade (devil, left) to the highest (angel, right).
function drawGauge(context, cx, cy, radius, score, grades) {
  const angle = value => Math.PI + value / 100 * Math.PI
  const ordered = [...grades].sort((a, b) => a.min - b.min)
  context.lineWidth = radius * .22
  context.lineCap = 'butt'
  ordered.forEach((grade, index) => {
    const end = ordered[index + 1]?.min ?? 100
    context.strokeStyle = grade.color
    context.beginPath()
    context.arc(cx, cy, radius, angle(grade.min) + (index ? .018 : 0), angle(end) - (index < ordered.length - 1 ? .018 : 0))
    context.stroke()
  })
  const devilX = cx - radius, angelX = cx + radius, faceY = cy + radius * .3, r = radius * .15
  context.fillStyle = ordered[0].color
  for (const side of [-1, 1]) {
    context.beginPath()
    context.moveTo(devilX + side * r * .95, faceY - r * .35)
    context.lineTo(devilX + side * r * .75, faceY - r * 1.75)
    context.lineTo(devilX + side * r * .15, faceY - r * .85)
    context.fill()
  }
  face(context, devilX, faceY, r, ordered[0].color, false)
  context.strokeStyle = '#ffd84a'
  context.lineWidth = r * .2
  context.beginPath()
  context.ellipse(angelX, faceY - r * 1.48, r * .85, r * .28, 0, 0, Math.PI * 2)
  context.stroke()
  face(context, angelX, faceY, r, '#f4f8ff', true)

  const direction = angle(score), length = radius * .7, half = radius * .065
  context.fillStyle = '#f4f8ff'
  context.beginPath()
  context.moveTo(cx + Math.cos(direction) * length, cy + Math.sin(direction) * length)
  context.lineTo(cx + Math.cos(direction + Math.PI / 2) * half, cy + Math.sin(direction + Math.PI / 2) * half)
  context.lineTo(cx - Math.cos(direction + Math.PI / 2) * half, cy - Math.sin(direction + Math.PI / 2) * half)
  context.fill()
  context.beginPath()
  context.arc(cx, cy, radius * .115, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = BACKGROUND
  context.beginPath()
  context.arc(cx, cy, radius * .05, 0, Math.PI * 2)
  context.fill()
}

export function drawShareCard({ score, grade, grades, stats, siteLabel }) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const context = canvas.getContext('2d')
  const background = context.createLinearGradient(0, 0, 0, canvas.height)
  background.addColorStop(0, '#12343a')
  background.addColorStop(.55, BACKGROUND)
  context.fillStyle = background
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  context.fillStyle = '#a5bec7'
  context.font = `700 40px ${FONT}`
  context.fillText('모두의 인성측정', 540, 80)
  drawGauge(context, 540, 430, 290, score, grades)

  context.fillStyle = '#f4f8ff'
  context.font = `800 110px ${FONT}`
  context.fillText(`내 인성 ${score}점`, 540, 640)
  context.fillStyle = grade.color
  context.font = `800 60px ${FONT}`
  context.fillText(`"${grade.name}"`, 540, 750)

  stats.forEach((stat, index) => {
    const x = 70 + index * 320
    roundedRect(context, x, 850, 300, 190, 24)
    context.fillStyle = '#1b342d'
    context.fill()
    context.strokeStyle = '#346354'
    context.lineWidth = 2
    context.stroke()
    context.fillStyle = '#e8f6f0'
    context.font = `600 32px ${FONT}`
    context.fillText(stat.label, x + 150, 905)
    context.fillStyle = '#6af3c8'
    context.font = `800 58px ${FONT}`
    context.fillText(stat.value, x + 150, 980)
  })

  roundedRect(context, 150, 1120, 780, 100, 50)
  context.fillStyle = '#00ffaa'
  context.fill()
  context.fillStyle = '#06231b'
  context.font = `800 44px ${FONT}`
  context.fillText('너는 몇 점? 얼굴만 찍어 봐', 540, 1172)
  context.fillStyle = '#a5bec7'
  context.font = `500 32px ${FONT}`
  context.fillText(siteLabel, 540, 1280)
  return canvas
}

export async function shareCardFile(details) {
  const blob = await new Promise(resolve => drawShareCard(details).toBlob(resolve, 'image/png'))
  return new File([blob], 'insung-result.png', { type: 'image/png' })
}
