<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { openCamera, stopCamera, captureCanvas } from '../services/cameraService.js'
import { getDetector } from '../services/faceDetector.js'
import { session, resetSession } from '../stores/session.js'
import FaceMesh from '../components/FaceMesh.vue'
import { faceFraming, createAutoCaptureGate, hasClosedEye, faceExpression, scanGuide } from '../utils/autoCapture.js'
import { checkCapturedFace, isFacingCamera } from '../utils/captureQuality.js'
import { extractFaceMetrics, measureFaceDetails, medianFaceMetrics, stableMetricKeys } from '../services/faceMeasurements.js'

const router = useRouter()
const video = ref(null), frame = ref(null), stream = shallowRef(null), facing = ref('user')
const faces = shallowRef([]), sourceSize = ref({ width: 0, height: 0 })
const status = ref('카메라를 준비하는 중...'), busy = ref(false)
const guideReady = ref(false), failed = ref(false)
const guideStyle = {
  width: `${scanGuide.maxWidth * 100}%`,
  height: `${scanGuide.maxHeight * 100}%`,
  top: `${scanGuide.centerY * 100}%`
}
let detector, frameId, frameKind, run = 0, active = true
let nextInferenceAt = 0, lastTimestamp = 0, lastMediaTime = -1
let autoRetryAfter = 0
let pendingHint, hintSince = 0
let trackingCanvas, trackingContext, qualityCanvas
const captureGate = createAutoCaptureGate()

function nextTimestamp() {
  lastTimestamp = Math.max(performance.now(), lastTimestamp + 1)
  return lastTimestamp
}
function cancelFrame() {
  if (frameId == null) return
  if (frameKind === 'video') video.value?.cancelVideoFrameCallback?.(frameId)
  else cancelAnimationFrame(frameId)
  frameId = null
}
function releaseCamera() {
  cancelFrame()
  stopCamera(stream.value)
  stream.value = null
  if (video.value) video.value.srcObject = null
}
function schedule(token) {
  if (!active || token !== run || !stream.value || busy.value) return
  if (video.value?.requestVideoFrameCallback) {
    frameKind = 'video'
    frameId = video.value.requestVideoFrameCallback((_now, metadata) => { frameId = null; processFrame(token, metadata.mediaTime) })
  } else {
    frameKind = 'animation'
    frameId = requestAnimationFrame(() => { frameId = null; processFrame(token, video.value?.currentTime) })
  }
}
function processFrame(token, mediaTime) {
  if (!active || token !== run || !stream.value || busy.value) return
  const now = performance.now()
  try {
    if (video.value?.readyState >= 2 && mediaTime !== lastMediaTime && now >= nextInferenceAt) {
      lastMediaTime = mediaTime
      if (sourceSize.value.width !== video.value.videoWidth || sourceSize.value.height !== video.value.videoHeight) {
        sourceSize.value = { width: video.value.videoWidth, height: video.value.videoHeight }
      }
      const result = trackFace()
      faces.value = result.faceLandmarks
      let measurements
      if (now >= autoRetryAfter) {
        const guidance = captureGuidance(result, video.value.videoWidth, video.value.videoHeight, trackingCanvas)
        guideReady.value = guidance.ready
        showTrackingHint(guidance.message, now)
        if (captureGate.update(guidance, now, guidance.metrics)) measurements = captureGate.recentMeasurements(now)
      }
      const finishedAt = performance.now()
      // Leave time for video and UI rendering when inference is slow.
      nextInferenceAt = Math.max(now + 65, finishedAt + (finishedAt - now))
      if (measurements) { shoot(measurements); return }
    }
  } catch (error) {
    fail(`얼굴 분석 중 오류가 발생했습니다. ${error.message}`)
    return
  }
  schedule(token)
}
function trackFace() {
  if (!trackingCanvas) {
    trackingCanvas = document.createElement('canvas')
    trackingContext = trackingCanvas.getContext('2d')
  }
  const { videoWidth, videoHeight } = video.value
  const scale = Math.min(1, 640 / Math.max(videoWidth, videoHeight))
  const width = Math.round(videoWidth * scale)
  const height = Math.round(videoHeight * scale)
  if (trackingCanvas.width !== width) trackingCanvas.width = width
  if (trackingCanvas.height !== height) trackingCanvas.height = height
  trackingContext.drawImage(video.value, 0, 0, width, height)
  return detector.detectForVideo(trackingCanvas, nextTimestamp())
}
function captureGuidance(result, width, height, canvas) {
  const framing = faceFraming(result.faceLandmarks[0], width, height, frame.value.clientWidth, frame.value.clientHeight)
  if (!framing.ready) return framing
  if (!isFacingCamera(result.facialTransformationMatrixes[0])) {
    return { ...framing, ready: false, message: '카메라를 정면으로 바라봐 주세요.' }
  }
  const expressions = result.faceBlendshapes[0]?.categories
  if (hasClosedEye(expressions)) {
    return { ...framing, ready: false, message: '두 눈을 뜨고 카메라를 바라봐 주세요.' }
  }
  const expression = faceExpression(expressions)
  if (expression.mouthOpen > .55) {
    return { ...framing, ready: false, message: '입을 가볍게 다물고 같은 표정을 유지해 주세요.' }
  }
  qualityCanvas ??= document.createElement('canvas')
  const points = result.faceLandmarks[0]
  const qualityIssue = checkCapturedFace(canvas, points, qualityCanvas)
  if (qualityIssue) return { ...framing, ready: false, message: qualityIssue }
  const metrics = extractFaceMetrics(measureFaceDetails(points, canvas.width / canvas.height))
  if (!metrics) return { ...framing, ready: false, message: '이마와 턱이 모두 보이도록 카메라를 맞춰 주세요.' }
  return { ...framing, metrics, expression }
}
function showTrackingHint(message, now) {
  if (message !== pendingHint) {
    pendingHint = message
    hintSince = now
  }
  // Keep a blink or a brief tracking drop from flashing a new prompt.
  if (now - hintSince >= 300) status.value = message
}
function fail(message) {
  ++run
  releaseCamera()
  faces.value = []
  guideReady.value = false
  busy.value = false
  failed.value = true
  status.value = message
}
async function start() {
  const token = ++run
  releaseCamera()
  busy.value = false
  failed.value = false
  faces.value = []
  guideReady.value = false
  captureGate.reset()
  pendingHint = undefined
  autoRetryAfter = 0
  sourceSize.value = { width: 0, height: 0 }
  status.value = '카메라를 준비하는 중...'
  let acquired
  try {
    acquired = await openCamera(facing.value)
    if (!active || token !== run) { stopCamera(acquired); return }
    stream.value = acquired
    // Another app or the OS can take the camera away; stopCamera() itself does not fire this event.
    acquired.getVideoTracks()[0]?.addEventListener('ended', () => {
      if (active && stream.value === acquired) fail('카메라 연결이 끊겼습니다. 다시 시도해 주세요.')
    })
    await nextTick()
    video.value.srcObject = acquired
    await video.value.play()
    if (!active || token !== run) { stopCamera(acquired); return }
    sourceSize.value = { width: video.value.videoWidth, height: video.value.videoHeight }
    status.value = '얼굴 분석 모델을 준비하는 중...'
    detector = await getDetector('VIDEO')
    if (!active || token !== run) return
    status.value = '얼굴을 화면 중앙에 맞춰 주세요'
    nextInferenceAt = 0; lastMediaTime = -1
    schedule(token)
  } catch (error) {
    if (token !== run) { stopCamera(acquired); return }
    fail(error.message)
  }
}
function switchCamera() {
  if (busy.value) return
  facing.value = facing.value === 'user' ? 'environment' : 'user'
  start()
}
function requestCapture() {
  if (busy.value || performance.now() < autoRetryAfter) return
  const measurements = captureGate.recentMeasurements(performance.now())
  if (measurements) shoot(measurements)
  else if (guideReady.value) status.value = '잠시만 그대로 있어 주세요. 여러 프레임을 확인하고 있어요.'
}
async function shoot(measurements) {
  if (faces.value.length !== 1 || busy.value || !detector || !video.value) return
  busy.value = true
  status.value = '얼굴을 촬영하고 확인하는 중...'
  const token = ++run
  cancelFrame()
  try {
    const captured = captureCanvas(video.value, facing.value === 'user')
    // Static detection checks the exact captured image and rejects extra faces.
    const imageDetector = await getDetector('IMAGE')
    if (!active || token !== run) return
    const result = imageDetector.detect(captured)
    const landmarks = result.faceLandmarks
    if (landmarks.length !== 1) {
      status.value = landmarks.length ? '여러 얼굴이 감지되었습니다. 한 명만 촬영해 주세요.' : '촬영 순간 얼굴을 찾지 못했습니다. 다시 시도해 주세요.'
      await resume(token)
      return
    }
    const guidance = captureGuidance(result, captured.width, captured.height, captured)
    if (!guidance.ready) {
      status.value = guidance.message
      await resume(token)
      return
    }
    const median = medianFaceMetrics(measurements)
    if (stableMetricKeys.some(key => Math.abs(median[key] - guidance.metrics[key]) > 5)) {
      status.value = '촬영 순간 얼굴이 움직였어요. 정면을 보고 그대로 있어 주세요.'
      await resume(token)
      return
    }
    const image = captured.toDataURL('image/jpeg', .9)
    releaseCamera()
    resetSession()
    session.image = image
    session.imageAspect = captured.width / captured.height
    session.landmarks = landmarks
    session.captureMetrics = medianFaceMetrics([...measurements, guidance.metrics])
    router.push('/analysis')
  } catch (error) {
    status.value = `촬영 중 오류가 발생했습니다. ${error.message}`
    await resume(token)
  }
}
async function resume(token) {
  if (!active || token !== run) return
  try {
    detector = await getDetector('VIDEO')
    if (!active || token !== run) return
    captureGate.reset()
    guideReady.value = false
    pendingHint = undefined
    autoRetryAfter = performance.now() + 1200
    busy.value = false
    schedule(token)
  } catch (error) {
    fail(`얼굴 분석 중 오류가 발생했습니다. ${error.message}`)
  }
}
// Mobile browsers freeze or drop the stream in the background, so release it and reopen on return.
function onVisibilityChange() {
  if (document.hidden) {
    if (!stream.value) return
    ++run
    releaseCamera()
    faces.value = []
    guideReady.value = false
    status.value = '카메라를 일시 중지했습니다.'
  } else if (!stream.value && !failed.value) start()
}
onMounted(() => { document.addEventListener('visibilitychange', onVisibilityChange); start() })
onBeforeUnmount(() => { active = false; ++run; document.removeEventListener('visibilitychange', onVisibilityChange); releaseCamera() })
</script>

<template>
  <section class="camera-page">
    <div class="camera-heading">
      <h1>카메라 스캔</h1>
      <router-link class="btn text-btn" to="/">닫기</router-link>
    </div>
    <div ref="frame" class="camera-frame glow">
      <video ref="video" autoplay muted playsinline :style="{ transform: facing === 'user' ? 'scaleX(-1)' : '' }"></video>
      <FaceMesh :landmarks="faces" :mirrored="facing === 'user'" :source-width="sourceSize.width" :source-height="sourceSize.height" />
      <div class="scan-guide" :class="{ 'scan-guide-ready': guideReady }" :style="guideStyle" aria-hidden="true"></div>
      <div class="camera-hint" role="status" aria-atomic="true" :class="{ 'camera-hint-error': failed }">
        {{ status }}
      </div>
    </div>
    <div v-if="failed" class="camera-actions">
      <button class="btn neon-btn" @click="start">다시 시도</button>
      <router-link class="btn outline-btn" to="/">사진으로 분석</router-link>
    </div>
    <div v-else class="camera-actions">
      <button class="btn neon-btn" :disabled="!guideReady || busy" @click="requestCapture">얼굴 촬영</button>
      <button class="btn outline-btn" :disabled="busy" @click="switchCamera">카메라 전환</button>
    </div>
    <p class="camera-caption muted">이마부터 턱까지 가이드 중앙에 맞춰 주세요. 얼굴이 안정되면 자동으로 촬영합니다.</p>
    <p class="camera-caption muted">사진은 기기에서 처리합니다. 촬영 대상자의 동의를 확인해 주세요.</p>
  </section>
</template>
<style scoped>
.camera-page{width:min(100%,520px,max(160px,calc(80vh - 104px)));margin:0 auto;padding:8px 0 16px}
.camera-page{width:min(100%,520px,max(160px,calc(80svh - 104px)))}
.camera-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}
.camera-heading h1{margin:0;font-size:20px}
.camera-heading .btn{padding:0 10px}
.camera-frame{width:100%;max-height:none}
.scan-guide{position:absolute;left:50%;z-index:3;transform:translate(-50%,-50%);border:2px dashed #e6fff5a0;border-radius:50%;pointer-events:none}
.scan-guide-ready{border:2px solid #48f7c1}
.camera-hint{position:absolute;z-index:5;inset:auto 12px 12px;padding:10px 12px;border:1px solid #00ffaa70;border-radius:10px;background:#061218ee;color:#eafbf5;font-size:14px;font-weight:600;line-height:1.5;text-align:center;pointer-events:none}
.camera-hint-error{border-color:#ff6e7c;color:#ffd7db}
.camera-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
.camera-actions .btn{padding:0 4px;font-size:14px}
.camera-caption{margin:8px 0 0;font-size:12px;line-height:1.5;text-align:center}
</style>
