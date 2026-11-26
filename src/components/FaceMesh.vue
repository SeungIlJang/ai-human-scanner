<script setup>
import { watch, ref, onMounted, onBeforeUnmount } from 'vue'
import { FaceLandmarker } from '@mediapipe/tasks-vision'
import { createCoverProjection } from '../utils/faceProjection.js'

const props = defineProps({ landmarks: Array, mirrored: Boolean, sourceWidth: Number, sourceHeight: Number, bright: Boolean })
const canvas = ref(null)
let resizeObserver

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
  const project = createCoverProjection(props.sourceWidth, props.sourceHeight, width, height, props.mirrored)
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
onMounted(() => { resizeObserver = new ResizeObserver(draw); resizeObserver.observe(canvas.value); draw() })
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>
<template><canvas ref="canvas" aria-hidden="true" /></template>
