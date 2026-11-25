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
</script><template><section><div class="page-head"><div class="eyebrow">ANALYSIS IN PROGRESS</div><h1>캐릭터 데이터 생성 중</h1><p class="muted">잠시만 기다려 주세요. 약 4초가 소요됩니다.</p></div><div class="analysis-layout"><ScanAnimation :image="session.image" :landmarks="session.landmarks" :progress="progress" /><div class="panel progress-panel"><span class="badge">● SIMULATION RUNNING</span><div class="big-progress">{{ progress }}<small>%</small></div><div class="score-track"><span :style="{width:progress+'%'}"></span></div><h2>{{ message }}</h2><p class="muted">시각화용 얼굴 특징점은 점수 산출에 사용되지 않습니다.</p><button class="btn text-btn" @click="cancel">분석 취소</button></div></div></section></template><style scoped>.analysis-layout{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:32px}.progress-panel{padding:32px}.big-progress{font-size:clamp(90px,13vw,160px);font-weight:800;line-height:1.2;color:#00ffaa;text-shadow:0 0 50px #00ffaa55;margin:28px 0}.big-progress small{font-size:28px}.score-track{height:10px}.progress-panel h2{margin:30px 0 8px}.progress-panel p{line-height:1.7;margin-bottom:28px}@media(max-width:760px){.analysis-layout{grid-template-columns:1fr}.progress-panel{padding:24px}.big-progress{font-size:90px;margin:14px 0}}</style>
