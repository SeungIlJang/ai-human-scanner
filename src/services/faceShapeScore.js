// Indices in MediaPipe's face mesh topology.
const FACE = {
  forehead: 10, chin: 152, leftCheek: 234, rightCheek: 454,
  leftOuterEye: 33, leftInnerEye: 133, rightOuterEye: 263, rightInnerEye: 362,
  nose: 1, leftMouth: 61, rightMouth: 291
}

export function measureFaceShape(points, imageAspect) {
  if (!Number.isFinite(imageAspect) || imageAspect <= 0) return null
  if (Object.values(FACE).some(index => !Number.isFinite(points?.[index]?.x) || !Number.isFinite(points?.[index]?.y))) return null

  // The input coordinates are normalized separately by image width and height.
  const distance = (from, to) => {
    const a = points[FACE[from]]
    const b = points[FACE[to]]
    return Math.hypot((a.x - b.x) * imageAspect, a.y - b.y)
  }
  const faceWidth = distance('leftCheek', 'rightCheek')
  const faceHeight = distance('forehead', 'chin')
  const leftEye = distance('leftOuterEye', 'leftInnerEye')
  const rightEye = distance('rightOuterEye', 'rightInnerEye')
  const leftCheek = distance('nose', 'leftCheek')
  const rightCheek = distance('nose', 'rightCheek')
  const leftMouth = distance('nose', 'leftMouth')
  const rightMouth = distance('nose', 'rightMouth')
  if (Math.min(faceWidth, faceHeight, leftEye, rightEye, leftCheek, rightCheek, leftMouth, rightMouth) < .001) return null

  const similarity = (a, b) => Math.round(100 * Math.min(a, b) / Math.max(a, b))
  const scores = [
    { label: '눈 너비 균형', value: similarity(leftEye, rightEye) },
    { label: '볼 간격 균형', value: similarity(leftCheek, rightCheek) },
    { label: '입꼬리 간격 균형', value: similarity(leftMouth, rightMouth) }
  ]
  return {
    total: Math.round(scores.reduce((sum, score) => sum + score.value, 0) / scores.length),
    scores,
    widthToHeight: Math.round(100 * faceWidth / faceHeight),
    eyeGapToWidth: Math.round(100 * distance('leftInnerEye', 'rightInnerEye') / faceWidth)
  }
}
