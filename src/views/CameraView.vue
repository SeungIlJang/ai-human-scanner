<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { openCamera, stopCamera, captureFrame } from '../services/cameraService.js'
import { detectFace } from '../services/faceDetector.js'
import { session, resetSession } from '../stores/session.js'
import FaceMesh from '../components/FaceMesh.vue'
const router=useRouter(), video=ref(null), stream=ref(null), facing=ref('user'), faces=ref([]), status=ref('카메라를 준비하는 중...'), busy=ref(false)
let timer, active=true
async function start() {
  stopCamera(stream.value);clearTimeout(timer);faces.value=[]
  try { stream.value=await openCamera(facing.value); await nextTick();if(!active){stopCamera(stream.value);return}video.value.srcObject=stream.value;await video.value.play();status.value='얼굴을 화면 중앙에 맞춰 주세요';poll() }
  catch(e){status.value=e.message}
}
async function poll(){if(!active||!stream.value)return;try{if(video.value?.readyState>=2){faces.value=await detectFace(video.value);status.value=faces.value.length===1?'얼굴 인식 완료 · 촬영할 수 있어요':faces.value.length>1?'여러 얼굴이 감지되었습니다. 한 명만 촬영해 주세요.':'얼굴을 찾는 중 · 정면을 바라봐 주세요'}}catch(e){status.value='얼굴 분석 모델을 불러오지 못했습니다. 연결 상태를 확인해 주세요.';return}timer=setTimeout(poll,350)}
async function switchCamera(){facing.value=facing.value==='user'?'environment':'user';await start()}
function shoot(){if(faces.value.length!==1||busy.value)return;busy.value=true;const img=captureFrame(video.value);const landmarks=faces.value;stopCamera(stream.value);stream.value=null;resetSession();session.image=img;session.landmarks=landmarks;router.push('/analysis')}
onMounted(start);onBeforeUnmount(()=>{active=false;clearTimeout(timer);stopCamera(stream.value);if(video.value)video.value.srcObject=null})
</script>
<template><section><div class="page-head"><div class="eyebrow">LIVE FACE CAPTURE</div><h1>카메라 스캔</h1><p class="muted">한 명의 얼굴을 화면에 맞춘 뒤 촬영해 주세요.</p></div><div class="camera-layout"><div class="camera-frame glow"><video ref="video" autoplay muted playsinline :style="{transform:facing==='user'?'scaleX(-1)':''}"></video><FaceMesh :landmarks="faces" :mirrored="facing==='user'" :source-width="video?.videoWidth" :source-height="video?.videoHeight" /><div class="hud"></div><div class="scan-info">{{ faces.length===1?'● FACE LOCKED':'○ SEARCHING FACE' }}</div></div><div class="camera-controls panel"><span class="badge">● LOCAL CAMERA</span><h2>촬영 준비</h2><p class="muted">빛이 충분하고 얼굴 전체가 보이는 위치에서 촬영하면 더 잘 인식됩니다.</p><div class="notice">사진과 얼굴 특징점은 기기 밖으로 전송되지 않습니다. 촬영 대상자의 동의를 확인해 주세요.</div><p :class="status.includes('못했')||status.includes('거부')?'error':'muted'" role="status">{{ status }}</p><div class="action-row"><button class="btn neon-btn" :disabled="faces.length!==1||busy" @click="shoot">◉ &nbsp; 얼굴 촬영</button><button class="btn outline-btn" @click="switchCamera">카메라 전환</button><router-link class="btn text-btn" to="/">닫기</router-link></div></div></div></section></template>
<style scoped>.camera-layout{display:grid;grid-template-columns:minmax(0,520px) 1fr;gap:28px;align-items:center}.camera-frame{width:100%}.camera-controls{padding:28px}.camera-controls h2{font-size:27px;margin:24px 0 8px}.camera-controls .muted{line-height:1.8}.camera-controls .notice{margin:24px 0}@media(max-width:760px){.camera-layout{grid-template-columns:1fr}.camera-controls{padding:20px}}</style>
