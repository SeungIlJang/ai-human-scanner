<script setup>
import { watch, ref, onMounted, onBeforeUnmount } from 'vue'
import { FaceLandmarker } from '@mediapipe/tasks-vision'
import { createCoverProjection, frameFacePhoto } from '../utils/faceProjection.js'

const props = defineProps({ landmarks: Array, mirrored: Boolean, sourceWidth: Number, sourceHeight: Number, bright: Boolean, photo: String })
const canvas = ref(null)
let resizeObserver
let loadedPhoto

function drawConnections(ctx, points, project, connections) {
  ctx.beginPath()
  for (const { start, end } of connections) {
    if (!points[start] || !points[end]) continue
    const a = project(points[start]), b = project(points[end])
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
  }
  ctx.stroke()
}

function drawBrackets(ctx, width, height, faceWidth, faceHeight) {
  const halfWidth = faceWidth / 2 + 12
  const halfHeight = faceHeight / 2 + 10
  const arm = Math.min(28, faceWidth / 4, faceHeight / 4)
  ctx.beginPath()
  for (const xSign of [-1, 1]) {
    for (const ySign of [-1, 1]) {
      const x = width / 2 + xSign * halfWidth
      const y = height / 2 + ySign * halfHeight
      ctx.moveTo(x, y - ySign * arm)
      ctx.lineTo(x, y)
      ctx.lineTo(x - xSign * arm, y)
    }
  }
  ctx.strokeStyle = '#1be9b8'
  ctx.lineWidth = 3
  ctx.stroke()
}

function draw() {
  const el = canvas.value
  if (!el) return
  const width = el.clientWidth, height = el.clientHeight
  if (!width || !height) return
  const ratio = window.devicePixelRatio || 1
  el.width = Math.round(width * ratio)
  el.height = Math.round(height * ratio)
  const ctx = el.getContext('2d')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  const points = props.landmarks?.[0]
  if (!points) return
  let project
  if (props.photo) {
    if (!loadedPhoto?.naturalWidth) return
    const crop = frameFacePhoto(points, loadedPhoto.naturalWidth, loadedPhoto.naturalHeight, width, height)
    if (!crop) return
    ctx.drawImage(loadedPhoto, crop.x, crop.y, crop.width, crop.height)
    ctx.fillStyle = 'rgba(0, 0, 0, .72)'
    ctx.fillRect(0, 0, width, height)
    drawBrackets(ctx, width, height, crop.faceWidth, crop.faceHeight)
    project = crop.project
  } else {
    project = createCoverProjection(props.sourceWidth, props.sourceHeight, width, height, props.mirrored)
  }
  if (!project) return

  ctx.strokeStyle = props.bright ? 'rgba(0,255,170,.55)' : 'rgba(0,255,170,.28)'
  ctx.lineWidth = props.bright ? 1 : .65
  drawConnections(ctx, points, project, FaceLandmarker.FACE_LANDMARKS_TESSELATION)

  // The model's face oval ends at the forehead, not the hairline. Keep it
  // subtle and emphasize features that the landmarks actually locate.
  ctx.strokeStyle = 'rgba(0,255,170,.24)'
  ctx.lineWidth = 1
  drawConnections(ctx, points, project, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL)
  ctx.strokeStyle = '#00ffaa'
  ctx.lineWidth = props.bright ? 2 : 1.7
  ctx.shadowColor = '#00ffaa'
  ctx.shadowBlur = 5
  for (const connections of [FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, FaceLandmarker.FACE_LANDMARKS_LIPS]) {
    drawConnections(ctx, points, project, connections)
  }
  ctx.shadowBlur = 0

  ctx.fillStyle = '#00ffaa'
  for (const point of points) {
    const { x, y } = project(point)
    ctx.beginPath()
    ctx.arc(x, y, props.bright ? 1.5 : 1, 0, Math.PI * 2)
    ctx.fill()
  }
}

watch(() => [props.landmarks, props.mirrored, props.sourceWidth, props.sourceHeight, props.bright], draw)
watch(() => props.photo, (src, _previous, onCleanup) => {
  loadedPhoto = null
  draw()
  if (!src) return
  const image = new Image()
  image.onload = () => { loadedPhoto = image; draw() }
  onCleanup(() => { image.onload = null })
  image.src = src
}, { immediate: true })
onMounted(() => { resizeObserver = new ResizeObserver(draw); resizeObserver.observe(canvas.value); draw() })
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>
<template><canvas ref="canvas" :aria-hidden="!photo" :role="photo ? 'img' : undefined" :aria-label="photo ? '스캔한 얼굴 사진과 얼굴 특징점' : undefined" /></template>
