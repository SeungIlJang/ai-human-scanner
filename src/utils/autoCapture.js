import { createCoverProjection } from './faceProjection.js'

export function faceFraming(points, sourceWidth, sourceHeight, viewWidth, viewHeight, mirrored = false) {
  const project = createCoverProjection(sourceWidth, sourceHeight, viewWidth, viewHeight, mirrored)
  if (!project || !points?.length) return { ready: false, message: '얼굴을 찾는 중 · 정면을 바라봐 주세요' }
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
  for (const point of points) {
    const { x, y } = project(point)
    left = Math.min(left, x); right = Math.max(right, x)
    top = Math.min(top, y); bottom = Math.max(bottom, y)
  }
  const box = { x: (left + right) / (2 * viewWidth), y: (top + bottom) / (2 * viewHeight), width: (right - left) / viewWidth, height: (bottom - top) / viewHeight }
  if (left < viewWidth * .04 || right > viewWidth * .96 || top < viewHeight * .06 || bottom > viewHeight * .94) return { ready: false, message: '얼굴 전체가 보이도록 조금 뒤로 이동해 주세요', box }
  if (box.width < .24 || box.height < .3) return { ready: false, message: '얼굴이 더 크게 보이도록 가까이 와 주세요', box }
  if (box.width > .82 || box.height > .86) return { ready: false, message: '얼굴이 더 작게 보이도록 조금 뒤로 이동해 주세요', box }
  if (Math.abs(box.x - .5) > .2 || Math.abs(box.y - .5) > .19) return { ready: false, message: '얼굴을 화면 중앙에 맞춰 주세요', box }
  return { ready: true, message: '얼굴을 인식했습니다 · 잠시만 그대로 있어 주세요', box }
}

export function createAutoCaptureGate(holdMs = 700, minSamples = 4) {
  let since = 0, lastSample = 0, samples = 0, anchor = null
  return {
    reset() { since = 0; lastSample = 0; samples = 0; anchor = null },
    update(framing, now) {
      if (!framing.ready) { this.reset(); return false }
      const box = framing.box
      const moved = anchor && (Math.abs(box.x - anchor.x) > .035 || Math.abs(box.y - anchor.y) > .035 || Math.abs(box.width - anchor.width) > .07 || Math.abs(box.height - anchor.height) > .07)
      if (!anchor || moved || now - lastSample > 400) { since = now; samples = 0; anchor = box }
      lastSample = now
      samples++
      return samples >= minSamples && now - since >= holdMs
    }
  }
}
