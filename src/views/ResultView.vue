<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { session, resetSession } from '../stores/session.js'
import { config } from '../services/scoreEngine.js'
import { summary, describe } from '../services/descriptionEngine.js'
import { measureFaceDetails } from '../services/faceMeasurements.js'
import traditions from '../data/physiognomy-sources.json'
import { makeShareImage, downloadBlob, DISCLAIMER } from '../services/shareService.js'
import FaceMesh from '../components/FaceMesh.vue'
import ScoreBar from '../components/ScoreBar.vue'

const router = useRouter()
const preview = ref(''), blob = ref(null), error = ref(''), busy = ref(false)
const faceShape = computed(() => session.result?.faceShape)
const character = computed(() => session.result?.character)
const result = computed(() => character.value?.profile)
const extraScores = config.scores.filter(item => !['kindness', 'mischief', 'flirt'].includes(item.key))
const measurements = computed(() => measureFaceDetails(session.landmarks?.[0], session.imageAspect, faceShape.value?.total))
const top = computed(() => extraScores.map(item => ({ ...item, value: result.value.scores[item.key] })).sort((a, b) => b.value - a.value).slice(0, 3))
const copy = computed(() => summary(result.value))
onBeforeUnmount(closePreview)

async function prepare() {
  busy.value = true; error.value = ''
  try {
    blob.value = await makeShareImage(session.image, character.value)
    closePreview()
    preview.value = URL.createObjectURL(blob.value)
  } catch { error.value = '공유 이미지를 생성하지 못했습니다.' }
  finally { busy.value = false }
}
async function share() {
  if (!blob.value) await prepare()
  if (!blob.value) return
  try {
    const file = new File([blob.value], 'ai-human-scanner-result.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: 'AI 인간 분석기', text: DISCLAIMER, files: [file] })
    else downloadBlob(blob.value)
  } catch (e) {
    if (e.name !== 'AbortError') { error.value = '공유할 수 없어 이미지를 저장합니다.'; downloadBlob(blob.value) }
  }
}
function restart() { resetSession(); router.push('/') }
function closePreview() { if (preview.value) URL.revokeObjectURL(preview.value); preview.value = '' }
</script>

<template>
  <section class="result-page">
    <div class="scanner-card">
      <h1 class="scanner-title">AI HUMAN SCANNER</h1>
      <section v-if="character" class="character-results" aria-labelledby="character-results-title">
        <h2 id="character-results-title">관상 캐릭터 결과</h2>
        <p>얼굴 측정값으로 만든 가상 캐릭터의 점수와 기록입니다.</p>
        <dl class="result-highlights">
          <div v-for="item in character.highlights" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value.toLocaleString('ko-KR') }}<small>{{ item.unit }}</small></dd>
          </div>
        </dl>
        <p class="fiction-note">오락용 가상 수치이며 실제 인성이나 행동을 측정한 값이 아닙니다.</p>
        <button class="btn neon-btn" :disabled="busy" @click="prepare">캐릭터 카드 공유</button>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </section>
      <div v-if="character" class="character-head">
        <p>관상 기반 캐릭터 점수</p>
        <h2>{{ character.title }}</h2>
        <strong>{{ character.total }}<small> / 100점</small></strong>
      </div>
      <div class="scan-visual">
        <FaceMesh :landmarks="session.landmarks" :photo="session.image" bright />
        <span class="visual-label">FACE SCAN / COMPLETE</span>
        <span class="scan-beam"></span>
        <span class="visual-complete">SIMULATION COMPLETE</span>
      </div>
      <section v-if="character" class="shape-score" aria-labelledby="ability-title">
        <h2 id="ability-title">캐릭터 능력치</h2>
        <p>사진에서 측정한 좌우 균형 60%와 앱의 얼굴 비율 환산 점수 40%를 합산합니다. 종합 점수는 세 능력치의 평균입니다.</p>
        <div class="featured-scores">
          <div v-for="stat in character.stats" :key="stat.label">
            <ScoreBar :label="stat.label" :value="stat.value" />
            <p>{{ stat.balance }} {{ stat.measuredBalance }}점 · {{ stat.ratioLabel }} {{ stat.measuredRatio }}% → {{ stat.ratioPoints }}점 ({{ stat.min }}~{{ stat.max }}% 기준)</p>
          </div>
        </div>
        <p>얼굴 특징을 게임 규칙으로 해석한 오락용 능력치입니다.</p>
      </section>
      <p v-else class="result-notice">이 사진에서는 캐릭터 점수를 계산할 얼굴 특징점이 부족합니다. 얼굴 전체가 보이는 사진으로 다시 시도해 주세요.</p>
      <section class="shape-score" aria-labelledby="shape-title">
        <div class="shape-heading">
          <h2 id="shape-title">관상 스캔 점수</h2>
          <strong v-if="faceShape">{{ faceShape.total }}점<small> / 100</small></strong>
        </div>
        <template v-if="faceShape">
          <p>사진에서 측정한 눈, 볼, 입꼬리의 좌우 균형 평균입니다.</p>
          <div class="featured-scores">
            <ScoreBar v-for="item in faceShape.scores" :key="item.label" :label="item.label" :value="item.value" />
          </div>
          <p>얼굴 너비는 높이의 {{ faceShape.widthToHeight }}%, 눈 사이 간격은 얼굴 너비의 {{ faceShape.eyeGapToWidth }}%입니다.</p>
        </template>
        <p v-else>이 사진에서 얼굴 비율을 측정하지 못했습니다.</p>
        <details v-if="measurements" class="shape-details">
          <summary>부위별 얼굴 측정값</summary>
          <p>사진 속 비율과 각도입니다. 얼굴형은 앱의 비율 기준으로 추정합니다. 이마와 상·중·하 비율은 모델의 이마 위쪽 점을 기준으로 하며, 광대 깊이는 사진에서 추정한 상대값입니다. 눈·눈썹·입꼬리 각도에서 양수는 바깥쪽이 위로 향한다는 뜻입니다.</p>
          <div class="measurement-grid">
            <section v-for="group in measurements" :key="group.title" class="measurement-group">
              <h3>{{ group.title }}</h3>
              <dl>
                <div v-for="row in group.rows" :key="row.label">
                  <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
                </div>
              </dl>
            </section>
          </div>
        </details>
        <details class="shape-details">
          <summary>전통 관상 용어와 출처</summary>
          <p>오관, 삼정, 오악은 전통 관상에서 쓰인 분류입니다. 캐릭터 능력치는 앱의 게임 규칙으로 계산합니다.</p>
          <ul class="tradition-list">
            <li v-for="concept in traditions.concepts" :key="concept.title">
              <strong>{{ concept.title }}</strong> {{ concept.summary }}
              <a :href="traditions.sources[concept.source].url" target="_blank" rel="noopener">{{ traditions.sources[concept.source].title }}</a>
            </li>
          </ul>
          <ul class="tradition-list">
            <li v-for="key in ['mai', 'shenxiang', 'riss']" :key="key">
              <a :href="traditions.sources[key].url" target="_blank" rel="noopener">{{ traditions.sources[key].title }}</a>
            </li>
          </ul>
        </details>
      </section>
      <button class="restart-button" @click="restart">◌ &nbsp; 다시 분석하기</button>
    </div>

    <details v-if="result" class="detail-panel panel">
      <summary>추가 캐릭터 정보</summary>
      <p class="muted">{{ DISCLAIMER }}</p>
      <div class="detail-intro">
        <img :src="session.image" alt="선택한 사진" class="detail-photo" />
        <div><h2>{{ result.title }} <strong>{{ result.grade }}</strong></h2><p>전생 직업 · {{ result.job }}</p><p>전생 재산 · {{ (result.seed % 990 + 10).toLocaleString() }}만 별코인</p></div>
      </div>
      <h3>가상 능력치</h3>
      <div class="score-grid"><ScoreBar v-for="item in extraScores" :key="item.key" :label="item.label" :value="result.scores[item.key]" /></div>
      <h3>캐릭터 해설</h3><p class="story">{{ copy }}</p>
      <h3>가장 높은 능력치 TOP 3</h3>
      <div v-for="(item, index) in top" :key="item.key" class="top-row"><span>0{{ index + 1 }} &nbsp; {{ item.label }}</span><b>{{ item.value }}점</b><p>{{ describe(result, item.key) }}</p></div>
    </details>

    <div v-if="preview" class="modal-backdrop" @click.self="closePreview"><div class="preview-card panel" role="dialog" aria-modal="true" aria-label="공유 이미지 미리보기"><h2>공유 이미지 미리보기</h2><img :src="preview" alt="공유할 결과 이미지 미리보기" style="width:100%;border-radius:8px" /><p class="small muted">{{ DISCLAIMER }}</p><div class="modal-actions"><button class="btn outline-btn" @click="downloadBlob(blob)">PNG 저장</button><button class="btn neon-btn" @click="share">공유하기</button><button class="btn text-btn" @click="closePreview">닫기</button></div></div></div>
  </section>
</template>

<style scoped>
.result-page{padding:24px 0 52px;max-width:700px;margin:auto}.scanner-card{background:#202020;border:1px solid #444;border-radius:13px;padding:14px 13px 16px;color:#f5f5f5}.scanner-title{text-align:center;font-size:17px;line-height:1.4;margin:0 0 5px;font-weight:800}.result-notice{text-align:center;color:#bcc9c6;font-size:12px;line-height:1.5;margin:0 0 12px}.scan-visual{height:clamp(300px,55vw,410px);position:relative;overflow:hidden;border-radius:9px;background-color:#071019;background-image:linear-gradient(#00c99b15 1px,transparent 1px),linear-gradient(90deg,#00c99b15 1px,transparent 1px);background-size:34px 34px}.scan-visual canvas{position:absolute;inset:0;width:100%;height:100%;z-index:1}.visual-label,.visual-complete{position:absolute;z-index:3;color:#17e5b5;font-size:15px}.visual-label{left:25px;top:20px}.visual-complete{bottom:17px;left:0;right:0;text-align:center;font-size:17px}.scan-beam{position:absolute;z-index:2;top:49%;left:25%;right:25%;height:3px;background:#18e7b6;box-shadow:0 0 10px 3px #14dba877;animation:pulse 2s ease-in-out infinite alternate}@keyframes pulse{to{opacity:.35}}.featured-scores{display:grid;gap:12px}.featured-scores :deep(.score-item){padding:0;background:transparent;border-radius:0}.featured-scores :deep(.score-item-head){font-size:13px;margin-bottom:6px}.featured-scores :deep(.score-item-head b){color:#eee}.featured-scores :deep(.score-track){background:#414149;height:6px}.restart-button{width:100%;border:0;background:#f2f2f2;color:#222;border-radius:22px;min-height:31px;font-size:13px;cursor:pointer}.restart-button:hover{background:#fff}.detail-panel{margin-top:20px;padding:22px}.detail-intro{display:flex;gap:20px;align-items:start}.detail-photo{width:130px;height:130px;object-fit:cover;border-radius:10px}.detail-intro h2{margin:8px 0;font-size:22px}.detail-intro h2 strong{color:#ffd700}.detail-intro p{font-size:13px;margin:7px 0;color:#a9c2cb}.detail-intro b{color:#00ffaa}.detail-panel h3{font-size:17px;margin:24px 0 12px}.story{font-size:14px;line-height:1.8;color:#d1e5eb}.top-row{border-top:1px solid #2a3948;padding:12px 0}.top-row span{color:#d8edf0}.top-row b{float:right;color:#00ffaa}.top-row p{font-size:13px;color:#8eabb5;margin:8px 0 0}@media(max-width:600px){.result-page{padding:14px 0 30px}.scan-visual{height:clamp(280px,70vw,390px)}.detail-intro{gap:13px}.detail-photo{width:95px;height:95px}.detail-intro h2{font-size:18px}.detail-panel{padding:16px}}
.shape-score{margin:14px 0;padding:14px;border:1px solid #367565;border-radius:10px;background:#142722}
.character-results{margin:12px 0 16px;padding:14px;border:1px solid #367565;border-radius:10px;background:#142722}
.character-results h2{margin:0;font-size:20px}
.character-results p{margin:7px 0;color:#c8dbd4;font-size:12px;line-height:1.5}
.character-results .error{color:#ff9ba4}
.result-highlights{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 8px}
.result-highlights div{padding:9px 10px;border:1px solid #346354;border-radius:8px;background:#1b342d}
.result-highlights dt{font-size:13px;color:#e8f6f0}
.result-highlights dd{margin:2px 0 0;color:#6af3c8;font-size:clamp(22px,6vw,34px);font-weight:800;font-variant-numeric:tabular-nums}
.result-highlights small{margin-left:2px;font-size:13px}
.character-results .btn{margin-top:5px}
.shape-score h2{margin:0;font-size:17px}
.character-head{text-align:center;padding:8px 0 16px}
.character-head p{margin:0;color:#b8d9d1;font-size:14px}
.character-head h2{margin:6px 0;color:#f4fffa;font-size:25px}
.character-head strong{font-size:32px;color:#21d9a4}
.character-head small{font-size:14px;color:#c8dbd4}
.detail-panel summary{cursor:pointer;font-weight:700}
.shape-heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px}
.shape-heading h2{margin:0;font-size:17px}
.shape-heading strong{color:#21d9a4;font-size:23px}
.shape-heading small{color:#bfd1ca;font-size:12px;font-weight:400}
.shape-score p{margin:8px 0 12px;color:#c8dbd4;font-size:12px;line-height:1.6}
.shape-score p:last-child{margin-bottom:0}
.shape-details{margin-top:12px;padding-top:10px;border-top:1px solid #367565}
.shape-details summary{cursor:pointer;color:#f5f5f5;font-size:14px;font-weight:700;padding:6px 0}
.measurement-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.measurement-group{padding:10px;border-radius:8px;background:#1b342d}
.measurement-group h3{margin:0 0 8px;font-size:14px}
.measurement-group dl{margin:0}
.measurement-group dl div{display:flex;justify-content:space-between;gap:8px;padding:4px 0;font-size:12px}
.measurement-group dd{margin:0;white-space:nowrap;color:#81f5d1}
.tradition-list{padding-left:19px;color:#c8dbd4;font-size:13px;line-height:1.6}
.tradition-list a{display:block;text-decoration:underline;color:#81f5d1}
@media(max-width:540px){.measurement-grid{grid-template-columns:1fr}}
</style>
