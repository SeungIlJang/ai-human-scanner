<script setup>
// The headline scores, the grade, and the best-fortune and caution cards.
defineProps({ scores: { type: Object, required: true } })
</script>

<template>
  <dl class="result-highlights">
    <div v-for="item in scores.highlights" :key="item.label">
      <dt>{{ item.label }}</dt>
      <dd v-if="item.unit">{{ item.value.toLocaleString('ko-KR') }}<small>{{ item.unit }}</small></dd>
      <dd v-else class="result-text">{{ item.value }}</dd>
      <dd v-if="item.label === '인성 점수'" class="grade-name" :style="{ color: scores.grade.color }">{{ scores.grade.emoji }} {{ scores.grade.name }}</dd>
    </div>
  </dl>
  <div class="fortune-cards">
    <section class="fortune-card fortune-best">
      <h3><span>가장 좋은 것</span>{{ scores.fortune.emoji }} {{ scores.fortune.name }}</h3>
      <p class="fortune-title">{{ scores.fortune.title }}</p>
      <p>{{ scores.fortune.reading }}</p>
      <p class="fortune-features">돋보인 부위: {{ scores.fortune.features.join(', ') }}</p>
      <p v-if="scores.fortune.quote" class="reading-quote">
        <q lang="zh-Hant">{{ scores.fortune.quote }}</q>
        <a :href="scores.fortune.url" target="_blank" rel="noopener">{{ scores.fortune.reference }}</a>
      </p>
    </section>
    <section class="fortune-card fortune-caution">
      <h3><span>가장 주의할 것</span>⚠️ {{ scores.caution.name }}</h3>
      <p>{{ scores.caution.reading }}</p>
      <p v-if="scores.caution.quote" class="reading-quote">
        <q lang="zh-Hant">{{ scores.caution.quote }}</q>
        <a :href="scores.caution.url" target="_blank" rel="noopener">{{ scores.caution.reference }}</a>
      </p>
    </section>
  </div>
</template>
