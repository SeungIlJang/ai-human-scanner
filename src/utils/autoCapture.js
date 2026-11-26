import { createCoverProjection } from './faceProjection.js'

export const scanGuide = { centerY: .5, maxWidth: .76, maxHeight: .74 }
const MIN_CAPTURE_FRAMES = 5

export function faceFraming(points, sourceWidth, sourceHeight, viewWidth, viewHeight, mirrored = false) {
  const project = createCoverProjection(sourceWidth, sourceHeight, viewWidth, viewHeight, mirrored)
  if (!project || !points?.length) return { ready: false, message: '얼굴 전체를 화면에 넣고 카메라를 바라봐 주세요.' }
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
  for (const point of points) {
    const { x, y } = project(point)
    left = Math.min(left, x); right = Math.max(right, x)
    top = Math.min(top, y); bottom = Math.max(bottom, y)
  }
  const box = { x: (left + right) / (2 * viewWidth), y: (top + bottom) / (2 * viewHeight), width: (right - left) / viewWidth, height: (bottom - top) / viewHeight }
  if (box.width > scanGuide.maxWidth || box.height > scanGuide.maxHeight) return { ready: false, message: '조금 더 멀리 이동해 주세요.', box }
  const horizontalInset = (1 - scanGuide.maxWidth) / 2
  const guideTop = scanGuide.centerY - scanGuide.maxHeight / 2
  const guideBottom = scanGuide.centerY + scanGuide.maxHeight / 2
  if (left < viewWidth * horizontalInset || right > viewWidth * (1 - horizontalInset) ||
      top < viewHeight * guideTop || bottom > viewHeight * guideBottom ||
      Math.abs(box.x - .5) > .09 || Math.abs(box.y - scanGuide.centerY) > .08) {
    return { ready: false, message: '얼굴을 가이드 중앙에 맞춰 주세요.', box }
  }
  const displayScale = Math.max(viewWidth / sourceWidth, viewHeight / sourceHeight)
  if (box.height < .50 || box.width * viewWidth / displayScale < 130 || box.height * viewHeight / displayScale < 160) {
    return { ready: false, message: '조금 더 가까이 와 주세요.', box }
  }
  return { ready: true, message: '좋아요. 잠시만 그대로 있어 주세요.', box }
}

export function hasClosedEye(categories) {
  return categories?.some(({ categoryName, score }) =>
    (categoryName === 'eyeBlinkLeft' || categoryName === 'eyeBlinkRight') && score >= .7
  ) ?? false
}

export function faceExpression(categories) {
  const value = key => categories?.find(item => item.categoryName === key)?.score ?? 0
  return {
    mouthOpen: value('jawOpen'),
    smile: Math.max(value('mouthSmileLeft'), value('mouthSmileRight'))
  }
}

export function createAutoCaptureGate(holdMs = 700, minSamples = MIN_CAPTURE_FRAMES) {
  let since = 0, lastSample = 0, samples = [], anchor = null, anchorExpression = null
  function reset() { since = 0; lastSample = 0; samples = []; anchor = null; anchorExpression = null }
  return {
    reset,
    update(framing, now, measurement) {
      if (!framing.ready) { reset(); return false }
      const box = framing.box
      const moved = anchor && (Math.abs(box.x - anchor.x) > .025 || Math.abs(box.y - anchor.y) > .025 || Math.abs(box.width - anchor.width) > .05 || Math.abs(box.height - anchor.height) > .05)
      const changedExpression = anchorExpression && framing.expression &&
        (Math.abs(framing.expression.smile - anchorExpression.smile) > .24 ||
          Math.abs(framing.expression.mouthOpen - anchorExpression.mouthOpen) > .18)
      if (!anchor || moved || changedExpression || now - lastSample > 400) {
        since = now
        samples = []
        anchor = box
        anchorExpression = framing.expression
      }
      lastSample = now
      samples.push(measurement)
      if (samples.length > 12) samples.shift()
      return samples.length >= minSamples && now - since >= holdMs
    },
    recentMeasurements(now) {
      if (samples.length < minSamples || now - lastSample > 250 || lastSample - since < 300) return null
      return samples.slice()
    }
  }
}
