<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { decodeShare } from '../services/shareCode.js'
import ResultScores from '../components/ResultScores.vue'
import ResultReadings from '../components/ResultReadings.vue'
import ResultExtras from '../components/ResultExtras.vue'
import '../result.css'

// Shows a friend's result from the code in the link. The code holds scores and readings only.
const route = useRoute()
const scores = computed(() => decodeShare(route.params.code))
const kindness = computed(() => scores.value?.highlights[0].value)
const gauge = computed(() => `${import.meta.env.BASE_URL}share/${kindness.value}.png`)
// Offer the store app only where one exists for this phone and its listing is public.
const agent = navigator.userAgent
const store = /Android/i.test(agent) ? __STORES__.android : /iPhone|iPad|iPod/.test(agent) ? __STORES__.ios : null
</script>

<template>
  <section class="result-page">
    <div v-if="scores" class="scanner-card">
      <img class="shared-gauge" :src="gauge" width="1200" height="630" :alt="`인성 ${kindness}점, ${scores.grade.name}을 가리키는 게이지`" @error="$event.target.hidden = true" />
      <section class="shape-score primary-results" aria-labelledby="shared-title">
        <h1 id="shared-title" class="shared-title">친구의 관상 결과</h1>
        <p>친구가 얼굴을 찍어 받은 결과예요. 사진과 얼굴 측정값은 공유되지 않고, 점수와 풀이만 담겨 있습니다.</p>
        <div class="shared-actions">
          <a v-if="store" class="btn neon-btn" :href="store.url">나도 측정하기 · {{ store.label }}</a>
          <router-link class="btn" :class="store ? 'outline-btn' : 'neon-btn'" to="/">{{ store ? '설치 없이 웹에서 해보기' : '나도 측정하기' }}</router-link>
        </div>
        <ResultScores :scores="scores" />
        <p>점수와 유형은 재미용 결과입니다. 실제 인성이나 행동을 평가하는 수치가 아닙니다.</p>
        <ResultReadings :scores="scores" />
      </section>
      <ResultExtras :scores="scores" />
      <div class="shared-actions">
        <a v-if="store" class="btn neon-btn" :href="store.url">내 인성은 몇 점? · {{ store.label }}</a>
        <router-link class="btn" :class="store ? 'outline-btn' : 'neon-btn'" to="/">{{ store ? '설치 없이 웹에서 해보기' : '내 인성은 몇 점? 지금 측정하기' }}</router-link>
      </div>
    </div>
    <div v-else class="scanner-card">
      <section class="shape-score primary-results">
        <h1 class="shared-title">결과를 불러오지 못했어요</h1>
        <p>링크가 잘렸거나 예전 형식의 링크예요. 대신 직접 측정해 보세요.</p>
        <div class="shared-actions">
          <router-link class="btn neon-btn" to="/">내 인성 측정하기</router-link>
        </div>
      </section>
    </div>
  </section>
</template>
