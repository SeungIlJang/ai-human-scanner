<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { session, resetSession } from '../stores/session.js'
import traditions from '../data/physiognomy-sources.json'
import FaceMesh from '../components/FaceMesh.vue'
import ScoreBar from '../components/ScoreBar.vue'

const router = useRouter()
const faceShape = computed(() => session.result?.faceShape)
const scores = computed(() => session.result?.scores)
const measurements = computed(() => session.result?.measurements)
const interpretations = computed(() => measurements.value?.filter(group => group.interpretation) ?? [])

function restart() {
  resetSession()
  router.push('/')
}
</script>

<template>
  <section class="result-page">
    <div class="scanner-card">
      <div class="scan-visual">
        <FaceMesh :landmarks="session.landmarks" :photo="session.image" bright />
        <h1 class="visual-label">얼굴 스캔 완료</h1>
        <span class="scan-beam"></span>
      </div>
      <section class="shape-score primary-results" aria-labelledby="results-title">
        <h2 id="results-title">관상 결과</h2>
        <template v-if="scores">
          <p>사진 속 얼굴을 오관·삼정·오악 기준으로 나눠 측정한 뒤 재미용 점수를 계산합니다.</p>
          <dl class="result-highlights">
            <div v-for="item in scores.highlights" :key="item.label">
              <dt>{{ item.label }}</dt>
              <dd v-if="item.unit">{{ item.value.toLocaleString('ko-KR') }}<small>{{ item.unit }}</small></dd>
              <dd v-else class="result-text">{{ item.value }}</dd>
            </div>
          </dl>
          <p>점수와 유형은 재미용 결과입니다. 실제 인성이나 행동을 평가하는 수치가 아닙니다.</p>
          <details class="shape-details">
            <summary>점수에 반영된 관상 기준</summary>
            <p>전통 관상 자료는 어떤 부위를 살펴볼지 정하는 데 쓰고, 점수와 유형은 앱의 규칙으로 생성합니다. 오관에서는 눈썹·눈·코·입의 사진 측정값을 사용합니다.</p>
            <p v-if="session.captureMetrics">카메라 촬영 점수에는 여러 프레임의 중앙값을 사용했습니다. 상세설명은 아래에 표시된 촬영 사진을 기준으로 합니다.</p>
            <p>얼굴 측정값이 같으면 점수와 유형도 같아요.</p>
            <div class="measurement-grid">
              <section v-for="group in scores.basis" :key="group.key" class="measurement-group">
                <h3>{{ group.title }}</h3>
                <dl>
                  <div v-for="item in group.measurements" :key="item.key">
                    <dt>{{ item.label }}</dt><dd>{{ item.value }}%</dd>
                  </div>
                </dl>
                <a class="basis-source" :href="traditions.sources[group.source].url" target="_blank" rel="noopener">분류 출처</a>
              </section>
            </div>
          </details>
        </template>
        <p v-else>점수를 계산할 얼굴 비율이 충분히 측정되지 않았습니다. 얼굴 전체가 보이는 정면 사진으로 다시 시도해 주세요.</p>
        <details v-if="interpretations.length" class="shape-details">
          <summary>관상 상세설명 · {{ interpretations.length }}개 항목</summary>
          <p>아래 문장은 이 사진의 이목구비에서 보이는 인상을 풀어 쓴 재미용 해석입니다.</p>
          <div class="interpretations">
            <section v-for="group in interpretations" :key="group.title" class="interpretation">
              <h3>{{ group.title }}</h3>
              <p class="interpretation-measurement">{{ group.interpretation.measurement }}</p>
              <p>{{ group.interpretation.impression }}</p>
              <p v-if="group.interpretation.source">
                {{ group.interpretation.tradition }}
                <a :href="traditions.sources[group.interpretation.source].url" target="_blank" rel="noopener">출처</a>
              </p>
            </section>
          </div>
        </details>
      </section>
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
          <p>오관, 삼정, 오악은 전통 관상에서 쓰인 분류입니다. 아래 자료는 전통 관상에서 얼굴을 살펴본 방식을 설명합니다.</p>
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
      <details v-if="scores?.additional.length" class="shape-score additional-scores">
        <summary>다른 점수 보기</summary>
        <div class="featured-scores">
          <template v-for="item in scores.additional" :key="item.key">
            <div v-if="item.unit === '회'" class="result-count">
              <span>{{ item.label }}</span><strong>{{ item.value.toLocaleString('ko-KR') }}{{ item.unit }}</strong>
            </div>
            <ScoreBar v-else :label="item.label" :value="item.value" />
          </template>
        </div>
      </details>
      <button class="restart-button" @click="restart">◌ &nbsp; 다시 분석하기</button>
    </div>
  </section>
</template>

<style scoped>
.result-page{padding:8px 0 40px;max-width:700px;margin:auto}.scanner-card{background:#202020;border:1px solid #444;border-radius:13px;padding:14px 13px 16px;color:#f5f5f5}.scan-visual{height:clamp(300px,55vw,410px);position:relative;overflow:hidden;border-radius:9px;background-color:#071019;background-image:linear-gradient(#00c99b15 1px,transparent 1px),linear-gradient(90deg,#00c99b15 1px,transparent 1px);background-size:34px 34px}.scan-visual canvas{position:absolute;inset:0;width:100%;height:100%;z-index:1}.visual-label{position:absolute;z-index:3;color:#17e5b5;font-size:15px}.visual-label{left:20px;top:16px;margin:0;font-weight:600}.scan-beam{position:absolute;z-index:2;top:49%;left:25%;right:25%;height:3px;background:#18e7b6;box-shadow:0 0 10px 3px #14dba877;animation:pulse 2s ease-in-out infinite alternate}@keyframes pulse{to{opacity:.35}}.featured-scores{display:grid;gap:12px}.featured-scores :deep(.score-item){padding:0;background:transparent;border-radius:0}.featured-scores :deep(.score-item-head){font-size:13px;margin-bottom:6px}.featured-scores :deep(.score-item-head b){color:#eee}.featured-scores :deep(.score-track){background:#414149;height:6px}.restart-button{width:100%;border:0;background:#f2f2f2;color:#222;border-radius:22px;min-height:31px;font-size:13px;cursor:pointer}.restart-button:hover{background:#fff}@media(max-width:600px){.result-page{padding:8px 0 30px}.scan-visual{height:clamp(180px,44vh,390px);height:clamp(180px,44svh,390px)}}
.shape-score{margin:14px 0;padding:14px;border:1px solid #367565;border-radius:10px;background:#142722}
.result-highlights{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 8px}
.result-highlights div{padding:9px 10px;border:1px solid #346354;border-radius:8px;background:#1b342d}
.result-highlights dt{font-size:13px;color:#e8f6f0}
.result-highlights dd{margin:2px 0 0;color:#6af3c8;font-size:clamp(22px,6vw,34px);font-weight:800;font-variant-numeric:tabular-nums}
.result-highlights small{margin-left:2px;font-size:13px}
.result-highlights .result-text{font-size:clamp(16px,4vw,20px);line-height:1.4;word-break:keep-all;overflow-wrap:anywhere}
.shape-score h2{margin:0;font-size:17px}
.primary-results h2{font-size:20px}
.shape-heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px}
.shape-heading h2{margin:0;font-size:17px}
.shape-heading strong{color:#21d9a4;font-size:23px}
.shape-heading small{color:#bfd1ca;font-size:12px;font-weight:400}
.shape-score p{margin:8px 0 12px;color:#c8dbd4;font-size:12px;line-height:1.6}
.shape-score p:last-child{margin-bottom:0}
.shape-details{margin-top:12px;padding-top:10px;border-top:1px solid #367565}
.shape-details summary{cursor:pointer;color:#f5f5f5;font-size:14px;font-weight:700;padding:6px 0}
.additional-scores summary{cursor:pointer;font-size:15px;font-weight:700;padding:6px 0}
.additional-scores .featured-scores{margin-top:12px}
.result-count{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:8px;background:#1b342d;font-size:13px}
.result-count strong{color:#81f5d1}
.interpretations{display:grid;gap:8px}
.interpretation{padding:11px;border-radius:8px;background:#1b342d}
.interpretation h3{margin:0;font-size:15px}
.interpretation p{margin:5px 0 0;font-size:13px}
.interpretation .interpretation-measurement{color:#81f5d1}
.interpretation a{color:#81f5d1;text-decoration:underline}
.measurement-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.measurement-group{padding:10px;border-radius:8px;background:#1b342d}
.measurement-group h3{margin:0 0 8px;font-size:14px}
.measurement-group dl{margin:0}
.measurement-group dl div{display:flex;justify-content:space-between;gap:8px;padding:4px 0;font-size:12px}
.measurement-group dd{margin:0;white-space:nowrap;color:#81f5d1}
.basis-source{display:inline-block;margin-top:6px;color:#81f5d1;text-decoration:underline;font-size:12px}
.tradition-list{padding-left:19px;color:#c8dbd4;font-size:13px;line-height:1.6}
.tradition-list a{display:block;text-decoration:underline;color:#81f5d1}
@media(max-width:540px){.measurement-grid{grid-template-columns:1fr}}
</style>
