const SAMPLE_SIZE = 96
const MIN_FRONT_ALIGNMENT = Math.cos(15 * Math.PI / 180)

export function isFacingCamera(matrix) {
  const data = matrix?.data
  if (matrix?.rows !== 4 || matrix?.columns !== 4 || data?.length !== 16) return false
  // The normalized z-axis measures the combined yaw and pitch.
  const axisLength = Math.hypot(data[8], data[9], data[10])
  return axisLength > 0 && data[10] / axisLength >= MIN_FRONT_ALIGNMENT
}

export function checkFacePixels(pixels, width, height) {
  const luminance = new Float32Array(width * height)
  let sum = 0, clipped = 0
  for (let i = 0; i < luminance.length; i++) {
    const offset = i * 4
    const value = .2126 * pixels[offset] + .7152 * pixels[offset + 1] + .0722 * pixels[offset + 2]
    luminance[i] = value
    sum += value
    if (value < 12 || value > 248) clipped++
  }
  const mean = sum / luminance.length
  if (mean < 42 || mean > 225 || clipped / luminance.length > .45) {
    return '얼굴에 빛이 고르게 비치는 곳으로 이동해 주세요'
  }

  let edgeSum = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const laplacian = 4 * luminance[i] - luminance[i - 1] - luminance[i + 1] - luminance[i - width] - luminance[i + width]
      edgeSum += laplacian * laplacian
    }
  }
  if (edgeSum / ((width - 2) * (height - 2)) < 14) return '사진이 흐립니다 · 렌즈를 확인하고 잠시 움직이지 마세요'
  return ''
}

export function checkCapturedFace(canvas, points, sample = document.createElement('canvas')) {
  // Measure the inner face so that sharp edges in the background cannot pass the check.
  const left = Math.max(0, Math.min(...points.map(point => point.x)))
  const right = Math.min(1, Math.max(...points.map(point => point.x)))
  const top = Math.max(0, Math.min(...points.map(point => point.y)))
  const bottom = Math.min(1, Math.max(...points.map(point => point.y)))
  const width = (right - left) * canvas.width
  const height = (bottom - top) * canvas.height
  if (width <= 0 || height <= 0) return '얼굴을 화면 중앙에 맞춰 주세요'

  if (sample.width !== SAMPLE_SIZE) sample.width = SAMPLE_SIZE
  if (sample.height !== SAMPLE_SIZE) sample.height = SAMPLE_SIZE
  const context = sample.getContext('2d', { willReadFrequently: true })
  context.drawImage(canvas, left * canvas.width + width * .15, top * canvas.height + height * .2,
    width * .7, height * .65, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
  return checkFacePixels(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data, SAMPLE_SIZE, SAMPLE_SIZE)
}
