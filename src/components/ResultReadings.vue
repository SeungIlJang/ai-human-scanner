<script setup>
import { computed } from 'vue'

// The per-feature readings: the most notable ones first, the rest folded away.
const props = defineProps({ scores: { type: Object, required: true }, note: { type: String, default: '' } })
// Lead with the features that differ most from the reference; a face near the reference still gets three.
const featured = computed(() => {
  const ranked = [...props.scores.readings].sort((a, b) => b.strength - a.strength)
  const notable = ranked.filter(item => item.band !== 'mid' && item.key !== 'symmetry')
  return (notable.length >= 3 ? notable : ranked).slice(0, 5)
})
const others = computed(() => props.scores.readings.filter(item => !featured.value.includes(item)))
</script>

<template>
  <div class="shape-details">
    <h3 class="readings-title">관상 풀이 · 눈에 띄는 {{ featured.length }}곳</h3>
    <p>측정한 {{ scores.readings.length }}개 부위 중 표준에서 가장 많이 벗어난 곳입니다. 근거 구절은 옛 관상서 《신상전편》에서 가져왔고, 점수 환산과 전생 직업·동물 유형은 이 앱이 정한 놀이 규칙입니다.</p>
    <div class="interpretations">
      <section v-for="item in featured" :key="item.key" class="interpretation">
        <h3>{{ item.title }} <span class="reading-band" :class="'reading-' + item.band">{{ item.bandLabel }}</span></h3>
        <p>{{ item.reading }}</p>
        <p v-if="item.quote" class="reading-quote">
          <q lang="zh-Hant">{{ item.quote }}</q>
          <a :href="item.url" target="_blank" rel="noopener">{{ item.reference }}</a>
        </p>
      </section>
    </div>
    <details v-if="others.length" class="more-readings">
      <summary>나머지 {{ others.length }}개 부위 보기</summary>
      <p v-if="note">{{ note }}</p>
      <details v-for="item in others" :key="item.key" class="interpretation reading-item">
        <summary>{{ item.title }} <span class="reading-band" :class="'reading-' + item.band">{{ item.bandLabel }}</span></summary>
        <p v-if="item.measurement" class="interpretation-measurement">{{ item.measurement }}</p>
        <p>{{ item.reading }}</p>
        <p v-if="item.quote" class="reading-quote">
          <q lang="zh-Hant">{{ item.quote }}</q>
          <a :href="item.url" target="_blank" rel="noopener">{{ item.reference }}</a>
        </p>
      </details>
    </details>
  </div>
</template>
