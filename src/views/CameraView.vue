<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { openCamera, stopCamera, captureCanvas } from '../services/cameraService.js'
import { getDetector } from '../services/faceDetector.js'
import { session, resetSession } from '../stores/session.js'
import FaceMesh from '../components/FaceMesh.vue'
import { faceFraming, createAutoCaptureGate } from '../utils/autoCapture.js'

const router = useRouter()
const video = ref(null), frame = ref(null), stream = shallowRef(null), facing = ref('user')
const faces = shallowRef([]), sourceSize = ref({ width: 0, height: 0 })
const status = ref('카메라를 준비하는 중...'), busy = ref(false)
let detector, frameId, frameKind, run = 0, active = true
let lastProcessed = 0, lastTimestamp = 0, lastMediaTime = -1
let autoRetryAfter = 0
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
    if (video.value?.readyState >= 2 && mediaTime !== lastMediaTime && now - lastProcessed >= 110) {
      lastProcessed = now
      lastMediaTime = mediaTime
      if (sourceSize.value.width !== video.value.videoWidth || sourceSize.value.height !== video.value.videoHeight) {
        sourceSize.value = { width: video.value.videoWidth, height: video.value.videoHeight }
      }
      faces.value = detector.detectForVideo(video.value, nextTimestamp()).faceLandmarks
      const framing = faceFraming(faces.value[0], video.value.videoWidth, video.value.videoHeight, frame.value.clientWidth, frame.value.clientHeight, facing.value === 'user')
      status.value = framing.message
      if (now >= autoRetryAfter && captureGate.update(framing, now)) { shoot(); return }
      if (now < autoRetryAfter) captureGate.reset()
    }
  } catch (error) {
    status.value = `얼굴 분석 중 오류가 발생했습니다. ${error.message}`
    releaseCamera()
    return
  }
  schedule(token)
}
async function start() {
  const token = ++run
  releaseCamera()
  faces.value = []
  captureGate.reset()
  autoRetryAfter = 0
  sourceSize.value = { width: 0, height: 0 }
  status.value = '카메라를 준비하는 중...'
  let acquired
  try {
    acquired = await openCamera(facing.value)
    if (!active || token !== run) { stopCamera(acquired); return }
    stream.value = acquired
    await nextTick()
    video.value.srcObject = acquired
    await video.value.play()
    if (!active || token !== run) { stopCamera(acquired); return }
    sourceSize.value = { width: video.value.videoWidth, height: video.value.videoHeight }
    status.value = '얼굴 분석 모델을 준비하는 중...'
    detector = await getDetector('VIDEO')
    if (!active || token !== run) return
    status.value = '얼굴을 화면 중앙에 맞춰 주세요'
    lastProcessed = 0; lastMediaTime = -1
    schedule(token)
  } catch (error) {
    if (token !== run) { stopCamera(acquired); return }
    releaseCamera()
    status.value = error.message
  }
}
function switchCamera() {
  if (busy.value) return
  facing.value = facing.value === 'user' ? 'environment' : 'user'
  start()
}
async function shoot() {
  if (faces.value.length !== 1 || busy.value || !detector || !video.value) return
  busy.value = true
  status.value = '얼굴을 촬영하고 확인하는 중...'
  const token = ++run
  cancelFrame()
  try {
    const captured = captureCanvas(video.value)
    // Static detection checks the exact captured image and rejects extra faces.
    const imageDetector = await getDetector('IMAGE')
    if (!active || token !== run) return
    const landmarks = imageDetector.detect(captured).faceLandmarks
    if (landmarks.length !== 1) {
      status.value = landmarks.length ? '여러 얼굴이 감지되었습니다. 한 명만 촬영해 주세요.' : '촬영 순간 얼굴을 찾지 못했습니다. 다시 시도해 주세요.'
      await resume(token)
      return
    }
    const image = captured.toDataURL('image/jpeg', .9)
    releaseCamera()
    resetSession()
    session.image = image
    session.landmarks = landmarks
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
    autoRetryAfter = performance.now() + 1200
    busy.value = false
    schedule(token)
  } catch (error) {
    status.value = `얼굴 분석 중 오류가 발생했습니다. ${error.message}`
    releaseCamera()
    busy.value = false
  }
}
onMounted(start)
onBeforeUnmount(() => { active = false; ++run; releaseCamera() })
</script>

<template>
  <section>
    <div class="page-head"><div class="eyebrow">LIVE FACE CAPTURE</div><h1>카메라 스캔</h1><p class="muted">얼굴이 안정적으로 인식되면 자동으로 촬영합니다.</p></div>
    <div class="camera-layout">
      <div ref="frame" class="camera-frame glow">
        <video ref="video" autoplay muted playsinline :style="{ transform: facing === 'user' ? 'scaleX(-1)' : '' }"></video>
        <FaceMesh :landmarks="faces" :mirrored="facing === 'user'" :source-width="sourceSize.width" :source-height="sourceSize.height" />
        <div class="scan-info">{{ faces.length === 1 ? '● FACE LOCKED' : '○ SEARCHING FACE' }}</div>
      </div>
      <div class="camera-controls panel">
        <span class="badge">● LOCAL CAMERA</span><h2>촬영 준비</h2>
        <p class="muted">얼굴 전체를 화면 중앙에 맞추고 잠시 움직이지 마세요. 자동 촬영이 어려우면 아래 버튼을 누를 수 있습니다.</p>
        <div class="notice">사진과 얼굴 특징점은 기기 밖으로 전송되지 않습니다. 촬영 대상자의 동의를 확인해 주세요.</div>
        <p :class="status.includes('오류') || status.includes('거부') ? 'error' : 'muted'" role="status">{{ status }}</p>
        <div class="action-row"><button class="btn neon-btn" :disabled="faces.length !== 1 || busy" @click="shoot">◉ &nbsp; 얼굴 촬영</button><button class="btn outline-btn" :disabled="busy" @click="switchCamera">카메라 전환</button><router-link class="btn text-btn" to="/">닫기</router-link></div>
      </div>
    </div>
  </section>
</template>
<style scoped>.camera-layout{display:grid;grid-template-columns:minmax(0,520px) 1fr;gap:28px;align-items:center}.camera-frame{width:100%}.camera-controls{padding:28px}.camera-controls h2{font-size:27px;margin:24px 0 8px}.camera-controls .muted{line-height:1.8}.camera-controls .notice{margin:24px 0}@media(max-width:760px){.camera-layout{grid-template-columns:1fr}.camera-controls{padding:20px}}</style>
