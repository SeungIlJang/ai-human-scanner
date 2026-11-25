// MediaPipe landmarks use normalized coordinates in the uncropped source frame.
// Match CSS object-fit: cover, then mirror only the front-camera preview.
export function createCoverProjection(sourceWidth, sourceHeight, viewWidth, viewHeight, mirrored = false) {
  if (!sourceWidth || !sourceHeight || !viewWidth || !viewHeight) return null
  const scale = Math.max(viewWidth / sourceWidth, viewHeight / sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  const offsetX = (viewWidth - drawWidth) / 2
  const offsetY = (viewHeight - drawHeight) / 2
  return point => ({
    x: offsetX + (mirrored ? 1 - point.x : point.x) * drawWidth,
    y: offsetY + point.y * drawHeight
  })
}
