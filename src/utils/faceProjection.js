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

export function frameFacePhoto(points, sourceWidth, sourceHeight, viewWidth, viewHeight) {
  if (!points?.length || !sourceWidth || !sourceHeight || !viewWidth || !viewHeight) return null
  let left = 1, top = 1, right = 0, bottom = 0
  for (const { x, y } of points) {
    left = Math.min(left, x)
    right = Math.max(right, x)
    top = Math.min(top, y)
    bottom = Math.max(bottom, y)
  }
  const faceWidth = (right - left) * sourceWidth
  const faceHeight = (bottom - top) * sourceHeight
  if (faceWidth <= 0 || faceHeight <= 0) return null

  const scale = Math.min(viewWidth * .68 / faceWidth, viewHeight * .67 / faceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  const x = viewWidth / 2 - (left + right) / 2 * width
  const y = viewHeight / 2 - (top + bottom) / 2 * height
  const project = point => ({ x: x + point.x * width, y: y + point.y * height })
  return { x, y, width, height, project, faceWidth: faceWidth * scale, faceHeight: faceHeight * scale }
}
