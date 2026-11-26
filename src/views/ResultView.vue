<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { session, resetSession } from '../stores/session.js'
import traditions from '../data/physiognomy-sources.json'
import rules from '../data/physiognomy-rules.json'
import { encodeShare } from '../services/shareCode.js'
import { isStoreApp } from '../utils/platform.js'
import FaceMesh from '../components/FaceMesh.vue'
import ResultScores from '../components/ResultScores.vue'
import ResultReadings from '../components/ResultReadings.vue'
import ResultExtras from '../components/ResultExtras.vue'
import '../result.css'

const router = useRouter()
const scores = computed(() => session.result?.scores)
const measurements = computed(() => session.result?.measurements)
const interpretations = computed(() => measurements.value?.filter(group => group.interpretation) ?? [])

const shareStatus = ref(''), sharing = ref(false)
// Shared links always use the public web address, not wherever this copy of the app is running.
const site = __SITE_URL__
const stat = label => scores.value.highlights.find(item => item.label === label).value
// Each score has its own page so that the link preview shows that score and grade.
// The code after ?d= lets that page show the whole result. It holds scores and readings, never measurements.
const shareUrl = () => `${site}s/${stat('인성 점수')}.html?d=${encodeShare(scores.value)}`
async function nativeShare(options) {
  if (!isStoreApp(window)) return false
  const { Share } = await import('@capacitor/share')
  await Share.share(options)
  return true
}
async function cacheShareFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  const { Directory, Filesystem } = await import('@capacitor/filesystem')
  const result = await Filesystem.writeFile({
    path: file.name,
    data: btoa(binary),
    directory: Directory.Cache,
  })
  return result.uri
}
async function nativeShareFile(file, options) {
  if (!isStoreApp(window)) return false
  const uri = await cacheShareFile(file)
  const { Share } = await import('@capacitor/share')
  await Share.share({ ...options, files: [uri] })
  return true
}
function shareText() {
  const { grade, fortune, caution } = scores.value
  // Korean particles depend on whether the last syllable ends in a consonant.
  const endsInConsonant = word => (word.charCodeAt(word.length - 1) - 0xAC00) % 28 > 0
  return [
    `나 인성 ${stat('인성 점수')}점 나왔어 ${grade.emoji} "${grade.name}"${endsInConsonant(grade.name) ? '이래' : '래'}!`,
    `${fortune.emoji} ${fortune.title}인데, ${caution.name}만 조심하래 ㅋㅋ`,
    '너는 몇 점인지 얼굴만 찍어 봐 👇'
  ].join('\n')
}
async function run(action) {
  if (sharing.value) return
  sharing.value = true
  shareStatus.value = ''
  try { await action() } catch (error) {
    // Closing the share sheet is not an error.
    if (error.name !== 'AbortError') shareStatus.value = '공유하지 못했습니다. 화면을 캡처해서 공유해 주세요.'
  } finally { sharing.value = false }
}
const shareLink = () => run(async () => {
  const text = shareText(), url = shareUrl()
  // No title: chat apps prepend it to the text, which repeats the app name.
  if (await nativeShare({ text, url, dialogTitle: '인성측정 결과 공유' })) return
  if (navigator.share) await navigator.share({ text, url })
  else {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    shareStatus.value = '공유 문구와 링크를 복사했어요. 붙여넣기 해 주세요.'
  }
})
const shareImage = () => run(async () => {
  const { shareCardFile } = await import('../utils/shareCard.js')
  const file = await shareCardFile({
    score: stat('인성 점수'), grade: scores.value.grade, grades: rules.grades,
    siteLabel: site.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    stats: [
      { label: '거짓말 횟수', value: `${stat('거짓말 횟수').toLocaleString('ko-KR')}회` },
      { label: '못된 점수', value: `${stat('못된 점수')}점` },
      { label: '잔머리 지수', value: `${stat('잔머리 지수')}점` }
    ]
  })
  if (await nativeShareFile(file, { text: `${shareText()}\n${shareUrl()}`, dialogTitle: '인성측정 결과 공유' })) return
  if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: `${shareText()}\n${shareUrl()}` })
  else {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(file)
    link.download = file.name
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    shareStatus.value = '결과 이미지를 저장했어요.'
  }
})

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
          <p>사진 속 얼굴을 측정해 《신상전편》의 부위별 풀이와 견준 뒤 재미용 점수로 환산합니다.</p>
          <ResultScores :scores="scores" />
          <div class="share-actions">
            <button class="share-button" :disabled="sharing" @click="shareLink">친구에게 공유</button>
            <button class="share-button share-secondary" :disabled="sharing" @click="shareImage">이미지로 공유</button>
          </div>
          <p class="share-status" role="status">{{ shareStatus }}</p>
          <p>점수와 유형은 재미용 결과입니다. 실제 인성이나 행동을 평가하는 수치가 아닙니다.</p>
          <ResultReadings :scores="scores" :note="session.captureMetrics ? '카메라 촬영에서는 여러 프레임의 중앙값으로 측정했습니다.' : ''" />
        </template>
        <p v-else>점수를 계산할 얼굴 비율이 충분히 측정되지 않았습니다. 얼굴 전체가 보이는 정면 사진으로 다시 시도해 주세요.</p>
        <details v-if="interpretations.length" class="shape-details">
          <summary>사진 속 인상 설명 · {{ interpretations.length }}개 항목</summary>
          <p>아래 문장은 측정값을 보이는 인상으로 풀어 쓴 설명이며, 관상서의 풀이와는 별개입니다.</p>
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
        <h2 id="shape-title">측정값과 출처</h2>
        <p v-if="!measurements">이 사진에서 얼굴 비율을 측정하지 못했습니다.</p>
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
            <li v-for="key in ['shenxiangText', 'mai', 'shenxiang', 'riss']" :key="key">
              <a :href="traditions.sources[key].url" target="_blank" rel="noopener">{{ traditions.sources[key].title }}</a>
            </li>
          </ul>
        </details>
      </section>
      <ResultExtras v-if="scores" :scores="scores" />
      <button class="restart-button" @click="restart">◌ &nbsp; 다시 분석하기</button>
    </div>
  </section>
</template>
