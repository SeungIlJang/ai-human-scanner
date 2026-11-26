<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { session, resetSession } from '../stores/session.js'
const router = useRouter(), file = ref(null), busy = ref(false), error = ref('')
const faceArt = ref(null)

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
    const { detectFace, loadImage } = await import('../services/faceDetector.js')
    url = URL.createObjectURL(chosen); const image = await loadImage(url)
    const faces = await detectFace(image)
    if (faces.length !== 1) { error.value = faces.length ? '여러 얼굴이 감지되었습니다. 한 명만 나온 사진을 선택해 주세요.' : '얼굴을 찾지 못했습니다. 정면 얼굴이 잘 보이는 사진을 선택해 주세요.'; return }
    const canvas = document.createElement('canvas'); const scale = Math.min(1, 1280/Math.max(image.width,image.height)); canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height)
    resetSession(); session.image=canvas.toDataURL('image/jpeg',.9);session.imageAspect=image.naturalWidth/image.naturalHeight;session.landmarks=faces;router.push('/analysis')
  } catch(e) { error.value = e.message.includes('fetch') ? '얼굴 분석 모델을 불러오지 못했습니다. 연결 상태를 확인해 주세요.' : e.message }
  finally { if(url) URL.revokeObjectURL(url); busy.value=false; event.target.value='' }
}
</script>

<template>
  <div class="home">
    <section class="home-hero" aria-labelledby="home-title">
      <h1 id="home-title" class="display">당신의 얼굴,<br><span class="gradient">캐릭터가 되다.</span></h1>
      <p class="hero-intro">얼굴을 스캔하고 나만의 캐릭터 카드를 만들어 보세요.</p>
      <div class="home-actions">
        <router-link class="btn btn-large neon-btn" to="/camera">카메라로 시작</router-link>
        <button class="btn btn-large outline-btn" :disabled="busy" @click="file.click()">
          {{ busy ? '사진 확인 중…' : '사진 선택' }}
        </button>
        <input ref="file" type="file" accept="image/*" hidden @change="selectPhoto" />
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="hero-art" aria-hidden="true">
        <div class="scan-reticle">
          <canvas ref="faceArt" width="280" height="256"></canvas>
        </div>
      </div>

      <p class="home-note">오락용 가상 결과입니다. 촬영 대상자의 동의를 받은 뒤 이용해 주세요.</p>
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
@media(max-height:500px){.home{padding-top:12px}.home-hero{padding-block:16px}.home-hero .display{font-size:clamp(30px,7vw,42px)}.hero-intro{margin:10px auto 13px}}
</style>
