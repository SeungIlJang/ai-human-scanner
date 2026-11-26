<script setup>
import ScoreBar from './ScoreBar.vue'

// The folded list of extra scores.
defineProps({ scores: { type: Object, required: true } })
</script>

<template>
  <details v-if="scores.additional.length" class="shape-score additional-scores">
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
</template>
