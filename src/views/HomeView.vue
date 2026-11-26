<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { session, resetSession } from '../stores/session.js'
import { checkCapturedFace, isFacingCamera } from '../utils/captureQuality.js'
import InstallPrompt from '../components/InstallPrompt.vue'
const router = useRouter(), file = ref(null), busy = ref(false), error = ref('')
const faceArt = ref(null)
const licenseUrl = `${import.meta.env.BASE_URL}MEDIAPIPE-APACHE-LICENSE.txt`

onMounted(() => {
  const context = faceArt.value?.getContext('2d')
  if (!context) return
  context.scale(2, 2)
  const outline = [[70, 12], [94, 19], [108, 37], [110, 59], [104, 82], [92, 102], [70, 115], [48, 102], [36, 82], [30, 59], [32, 37], [46, 19], [70, 12]]
  const details = [
    [[32, 37], [54, 35], [70, 43], [86, 35], [108, 37]],
    [[30, 59], [49, 49], [59, 54], [49, 59], [39, 55]],
    [[110, 59], [91, 49], [81, 54], [91, 59], [101, 55]],
    [[70, 43], [62, 68], [70, 73], [78, 68], [70, 43]],
    [[48, 102], [54, 86], [70, 81], [86, 86], [92, 102]],
    [[54, 86], [70, 94], [86, 86]],
    [[36, 82], [54, 86], [62, 68], [49, 59], [36, 82]],
    [[104, 82], [86, 86], [78, 68], [91, 59], [104, 82]],
    [[48, 102], [70, 103], [92, 102], [70, 115]]
  ]
  function trace(path) {
    context.beginPath()
    context.moveTo(...path[0])
    for (const point of path.slice(1)) context.lineTo(...point)
    context.stroke()
  }
  context.strokeStyle = '#5cffe0bd'
  context.lineWidth = 1
  trace(outline)
  context.strokeStyle = '#42dfb66b'
  context.lineWidth = .8
  details.forEach(trace)
  context.fillStyle = '#95ffe8'
  for (const [x, y] of [[70, 12], [30, 59], [49, 49], [70, 43], [91, 49], [110, 59], [70, 73], [54, 86], [86, 86], [70, 115]]) {
    context.beginPath()
    context.arc(x, y, 1.5, 0, Math.PI * 2)
    context.fill()
  }
})
async function selectPhoto(event) {
  const chosen = event.target.files?.[0]; if (!chosen) return
  error.value = ''; if (!chosen.type.startsWith('image/')) { error.value='이미지 파일을 선택해 주세요.'; return }
  busy.value = true; let url
  try {
    const { getDetector, loadImage } = await import('../services/faceDetector.js')
    url = URL.createObjectURL(chosen); const image = await loadImage(url)
    // Detect on the downscaled canvas: it has the orientation the user sees and a bounded size.
    const canvas = document.createElement('canvas'); const scale = Math.min(1, 1280/Math.max(image.naturalWidth,image.naturalHeight)); canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height)
    const result = (await getDetector('IMAGE')).detect(canvas)
    const faces = result.faceLandmarks
    if (faces.length !== 1) { error.value = faces.length ? '여러 얼굴이 감지되었습니다. 한 명만 나온 사진을 선택해 주세요.' : '얼굴을 찾지 못했습니다. 정면 얼굴이 잘 보이는 사진을 선택해 주세요.'; return }
    if (!isFacingCamera(result.facialTransformationMatrixes?.[0])) { error.value = '얼굴이 옆이나 위아래로 돌아가 있습니다. 정면을 바라보는 사진을 선택해 주세요.'; return }
    if (checkCapturedFace(canvas, faces[0])) { error.value = '얼굴이 너무 어둡거나 밝거나 흐립니다. 얼굴이 선명하게 나온 사진을 선택해 주세요.'; return }
    resetSession(); session.image=canvas.toDataURL('image/jpeg',.9);session.imageAspect=canvas.width/canvas.height;session.landmarks=faces;router.push('/analysis')
  } catch(e) { error.value = e.message.includes('fetch') ? '얼굴 분석 모델을 불러오지 못했습니다. 연결 상태를 확인해 주세요.' : e.message }
  finally { if(url) URL.revokeObjectURL(url); busy.value=false; event.target.value='' }
}
</script>

<template>
  <div class="home">
    <section class="home-hero" aria-labelledby="home-title">
      <h1 id="home-title" class="display">얼굴에 다 써 있어요<br><span class="gradient">내 인성, 몇 점일까?</span></h1>
      <p class="hero-intro">얼굴의 비율과 좌우 균형을 측정하고 재미용 관상 점수를 확인해 보세요.</p>
      <div class="home-actions">
        <router-link class="btn btn-large neon-btn" to="/camera">카메라로 시작</router-link>
        <button class="btn btn-large outline-btn" :disabled="busy" @click="file.click()">
          {{ busy ? '사진 확인 중…' : '사진 선택' }}
        </button>
        <input ref="file" type="file" accept="image/*" hidden @change="selectPhoto" />
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <InstallPrompt />

      <div class="hero-art" aria-hidden="true">
        <div class="scan-reticle">
          <canvas ref="faceArt" width="280" height="256"></canvas>
        </div>
      </div>

      <p class="home-note"><strong>오락용 가상 결과입니다.</strong> 촬영 대상자의 동의를 받은 뒤 이용해 주세요. 분석을 시작하면 아래 개인정보 안내에 동의한 것으로 봅니다.</p>
      <details class="privacy-note">
        <summary>개인정보 안내</summary>
        <p>사진과 얼굴 특징점은 이 기기의 메모리에서만 처리합니다. 서버로 보내거나 기기에 저장하지 않으며, 홈으로 돌아오면 지웁니다.</p>
        <p>얼굴 인식에는 Google MediaPipe를 사용합니다. 입력 이미지는 기기에서 처리되어 Google 서버로 전송되지 않습니다. 다만 MediaPipe는 라이브러리의 성능·사용량 지표를 Google로 전송하며, Google은 이를 개인정보처리방침에 따라 처리합니다. 분석을 시작하면 이에 동의한 것으로 봅니다.
          <a href="https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md#privacy-notice" target="_blank" rel="noopener">MediaPipe 개인정보 안내</a>
          · <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google 개인정보처리방침</a>
        </p>
        <p><a :href="licenseUrl" target="_blank" rel="noopener">오픈소스 라이선스 (MediaPipe, Apache-2.0)</a></p>
      </details>
    </section>
  </div>
</template>

<style scoped>
.home{padding:clamp(18px,4vw,48px) 0 32px}
.home-hero{position:relative;max-width:720px;margin:0 auto;padding:clamp(18px,5vw,42px);text-align:center;border:1px solid #284852;border-radius:24px;background:radial-gradient(ellipse at 50% 0,#173b40 0,transparent 58%),#0d1724;box-shadow:0 18px 50px #02070e74}
.home-hero .display{margin:0;font-size:clamp(32px,7vw,64px);line-height:1.1;letter-spacing:-.05em;overflow-wrap:normal;word-break:keep-all}
.hero-intro{margin:14px auto 18px;max-width:32ch;color:#bbced6;font-size:clamp(13px,2.7vw,16px);line-height:1.6;word-break:keep-all}
.home-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-width:420px;margin:auto}
.home-actions .btn{padding:0 6px;min-height:48px;font-size:clamp(13px,2.7vw,15px);font-weight:700;word-break:keep-all}
.home-actions .outline-btn{background:#102736;color:#f4f8ff!important;border-color:#426570!important}
.hero-art{position:relative;display:grid;place-items:center;height:clamp(158px,32vw,230px);overflow:hidden;margin:18px 0 0;border:1px solid #23434b;border-radius:15px;background:radial-gradient(ellipse at center,#124043 0,transparent 73%),repeating-linear-gradient(0deg,#25d6a812 0 1px,transparent 1px 20px),repeating-linear-gradient(90deg,#25d6a812 0 1px,transparent 1px 20px),#0b1c29;background-position:center}
.scan-reticle{position:relative;display:grid;place-items:center;width:clamp(132px,25vw,190px);aspect-ratio:1;border:1px solid #65efcd55;background:radial-gradient(circle,#34eabe14 0,transparent 75%);border-radius:50%}
.scan-reticle::before{content:"";position:absolute;inset:8px;background:linear-gradient(#6bffe1,#6bffe1) left top/17px 2px,linear-gradient(#6bffe1,#6bffe1) left top/2px 17px,linear-gradient(#6bffe1,#6bffe1) right top/17px 2px,linear-gradient(#6bffe1,#6bffe1) right top/2px 17px,linear-gradient(#6bffe1,#6bffe1) left bottom/17px 2px,linear-gradient(#6bffe1,#6bffe1) left bottom/2px 17px,linear-gradient(#6bffe1,#6bffe1) right bottom/17px 2px,linear-gradient(#6bffe1,#6bffe1) right bottom/2px 17px;background-repeat:no-repeat}
.scan-reticle canvas{width:85%;height:auto;display:block;filter:drop-shadow(0 0 9px #28f2b66e)}
.home-note{margin:14px auto 0;color:#a5bec7;font-size:12px;line-height:1.55;word-break:keep-all}
.home-note strong{color:#6af3c8;font-size:13px;font-weight:800}
.privacy-note{margin:10px auto 0;max-width:46ch;color:#a5bec7;font-size:12px;line-height:1.6;text-align:left;word-break:keep-all}
.privacy-note summary{cursor:pointer;padding:6px 0;text-align:center;font-weight:700;color:#c9dde4}
.privacy-note p{margin:6px 0 0}
.privacy-note a{color:#81f5d1;text-decoration:underline}
@media(max-height:500px){.home{padding-top:12px}.home-hero{padding-block:16px}.home-hero .display{font-size:clamp(30px,7vw,42px)}.hero-intro{margin:10px auto 13px}}
</style>
