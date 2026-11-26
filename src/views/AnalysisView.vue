<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { session, resetSession } from '../stores/session.js'
import { createScores, makeSeed } from '../services/scoreEngine.js'
import ScanAnimation from '../components/ScanAnimation.vue'
const router=useRouter(), progress=ref(0), timer=ref(null)
let finishTimer
const steps=['얼굴 감지 중...','얼굴 특징점 추출 중...','얼굴 형태 시각화 중...','재미용 캐릭터 데이터 생성 중...','가상 시뮬레이션 완료!']
const message=computed(()=>steps[Math.min(4,Math.floor(progress.value/23))])
function completeTone(){try{const context=new (window.AudioContext||window.webkitAudioContext)();const oscillator=context.createOscillator(),gain=context.createGain();oscillator.frequency.setValueAtTime(660,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(990,context.currentTime+.2);gain.gain.setValueAtTime(.08,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.3);oscillator.connect(gain).connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.3);setTimeout(()=>context.close(),400)}catch{}}
onMounted(()=>{const started=performance.now();const seed=makeSeed();session.seed=seed;timer.value=setInterval(()=>{progress.value=Math.min(100,Math.round((performance.now()-started)/40));if(progress.value>=100){clearInterval(timer.value);session.result=createScores(seed);completeTone();finishTimer=setTimeout(()=>router.push('/result'),450)}},40)})
onBeforeUnmount(()=>{clearInterval(timer.value);clearTimeout(finishTimer)})
function cancel(){resetSession();router.push('/')}
</script>

<template>
  <section class="analysis-layout">
    <ScanAnimation :image="session.image" :landmarks="session.landmarks" :progress="progress" />
    <div class="panel progress-panel">
      <h1>캐릭터 데이터 생성 중</h1>
      <div class="score-track" role="progressbar" aria-label="스캔 진행률" :aria-valuenow="progress"><span :style="{ width: progress + '%' }"></span></div>
      <p class="scan-message">{{ message }}</p>
      <p class="muted">시각화용 얼굴 특징점은 점수 산출에 사용되지 않습니다.</p>
      <button class="btn text-btn" @click="cancel">분석 취소</button>
    </div>
  </section>
</template>

<style scoped>
.analysis-layout{display:grid;grid-template-columns:1fr 1fr;align-items:start;gap:24px;padding:8px 0 16px}
.progress-panel{padding:22px}
.progress-panel h1{margin:0 0 14px;font-size:22px}
.score-track{height:8px}
.score-track span{transition:width .1s linear}
.scan-message{margin:12px 0 6px;font-weight:600}
.progress-panel .muted{font-size:13px;line-height:1.5;margin:0}
.progress-panel .btn{padding:0;margin-top:4px}
@media(max-width:760px){
  .analysis-layout{grid-template-columns:1fr;gap:10px;max-width:430px;margin:auto}
  .progress-panel{padding:14px}
  .progress-panel h1{font-size:18px}
}
</style>
