// Draws the result as an image for chats that show pictures better than text. It contains no photo.
const FONT = "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif"

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}

export function drawShareCard({ animal, job, stats, siteLabel }) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const context = canvas.getContext('2d')
  const background = context.createLinearGradient(0, 0, 0, canvas.height)
  background.addColorStop(0, '#12343a')
  background.addColorStop(.55, '#0a0f1c')
  context.fillStyle = background
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  context.fillStyle = '#a5bec7'
  context.font = `700 40px ${FONT}`
  context.fillText('모두의 인성측정', 540, 90)

  context.fillStyle = '#12303a'
  context.beginPath()
  context.arc(540, 300, 150, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = '#00ffaa'
  context.lineWidth = 5
  context.stroke()
  context.font = `170px ${FONT}`
  context.fillText(animal.emoji, 540, 310)

  context.fillStyle = '#f4f8ff'
  context.font = `800 92px ${FONT}`
  context.fillText(`나는 ${animal.name}!`, 540, 540)
  context.fillStyle = '#6af3c8'
  context.font = `700 44px ${FONT}`
  context.fillText(`전생엔 ${job}`, 540, 630)

  stats.forEach((stat, index) => {
    const x = 70 + (index % 2) * 480
    const y = 720 + Math.floor(index / 2) * 190
    roundedRect(context, x, y, 460, 165, 24)
    context.fillStyle = '#1b342d'
    context.fill()
    context.strokeStyle = '#346354'
    context.lineWidth = 2
    context.stroke()
    context.fillStyle = '#e8f6f0'
    context.font = `600 34px ${FONT}`
    context.fillText(stat.label, x + 230, y + 46)
    context.fillStyle = '#6af3c8'
    context.font = `800 68px ${FONT}`
    context.fillText(stat.value, x + 230, y + 112)
  })

  roundedRect(context, 150, 1130, 780, 100, 50)
  context.fillStyle = '#00ffaa'
  context.fill()
  context.fillStyle = '#06231b'
  context.font = `800 44px ${FONT}`
  context.fillText('너는 몇 점? 얼굴만 찍어 봐', 540, 1182)
  context.fillStyle = '#a5bec7'
  context.font = `500 32px ${FONT}`
  context.fillText(siteLabel, 540, 1285)
  return canvas
}

export async function shareCardFile(details) {
  const blob = await new Promise(resolve => drawShareCard(details).toBlob(resolve, 'image/png'))
  return new File([blob], 'insung-result.png', { type: 'image/png' })
}
