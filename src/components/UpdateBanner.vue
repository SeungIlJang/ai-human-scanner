<script setup>
import { computed } from 'vue'
import { update } from '../stores/update.js'
import { updateMessage } from '../utils/liveUpdate.js'

// Tells the user that the store app is updating itself. Never appears on the website.
const message = computed(() => updateMessage(update))
const percent = computed(() => update.status === 'downloading' && Number.isFinite(update.percent) ? Math.max(0, Math.min(100, update.percent)) : null)
</script>

<template>
  <div v-if="message" class="update-banner" role="status">
    <p>{{ message }}</p>
    <div v-if="update.status !== 'ready'" class="update-track" :class="{ 'update-unknown': percent === null }">
      <span :style="percent === null ? undefined : { width: percent + '%' }"></span>
    </div>
  </div>
</template>

<style scoped>
.update-banner{margin:0 auto 14px;padding:10px 12px;max-width:420px;border:1px solid #2f8f78;border-radius:12px;background:#12302b;text-align:center}
.update-banner p{margin:0;color:#e8f6f0;font-size:13px;font-weight:600;line-height:1.5;word-break:keep-all}
.update-track{height:5px;margin-top:8px;border-radius:3px;background:#24443d;overflow:hidden}
.update-track span{display:block;height:100%;border-radius:3px;background:#00ffaa;transition:width .2s linear}
/* Progress unknown: a sliding bar instead of a filled one. */
.update-unknown span{width:35%;animation:update-slide 1.2s ease-in-out infinite alternate}
@keyframes update-slide{from{transform:translateX(0)}to{transform:translateX(186%)}}
</style>
