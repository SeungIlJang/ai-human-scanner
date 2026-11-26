<script setup>
import { computed } from 'vue'
import { install } from '../stores/install.js'

const agent = navigator.userAgent
const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
// Links shared in KakaoTalk open in its in-app browser, which cannot install the app.
const inKakao = /KAKAOTALK/i.test(agent)
const iosSafari = /iPhone|iPad|iPod/.test(agent) && !/CriOS|FxiOS|EdgiOS|KAKAOTALK|NAVER|Instagram|Line\//i.test(agent)
const externalUrl = `kakaotalk://web/openExternal?url=${encodeURIComponent(location.href.split('#')[0])}`
const mode = computed(() => {
  if (standalone || install.installed) return ''
  if (inKakao) return 'kakao'
  if (install.prompt) return 'prompt'
  return iosSafari ? 'ios' : ''
})

async function add() {
  const event = install.prompt
  if (!event) return
  event.prompt()
  await event.userChoice
  // The browser allows each captured event to be used once.
  install.prompt = null
}
</script>

<template>
  <div v-if="mode" class="install-prompt">
    <template v-if="mode === 'kakao'">
      <p>카카오톡 안에서는 카메라와 앱 설치가 막힐 수 있어요.</p>
      <a class="btn install-btn" :href="externalUrl">기본 브라우저로 열기</a>
    </template>
    <template v-else-if="mode === 'prompt'">
      <p>홈 화면에 추가하면 앱처럼 바로 열 수 있어요.</p>
      <button class="btn install-btn" @click="add">홈 화면에 앱 추가</button>
    </template>
    <p v-else>앱처럼 쓰려면 Safari의 <b>공유</b> 버튼에서 <b>홈 화면에 추가</b>를 눌러 주세요.</p>
  </div>
</template>

<style scoped>
.install-prompt{margin:14px auto 0;padding:12px;max-width:420px;border:1px dashed #3f7b6b;border-radius:12px;background:#0f2527;text-align:center}
.install-prompt p{margin:0;color:#c9dde4;font-size:13px;line-height:1.5;word-break:keep-all}
.install-prompt b{color:#6af3c8}
.install-btn{margin-top:8px;min-height:42px;padding:0 18px;background:#102736;border-color:#00ffaa;color:#6af3c8;font-size:14px;font-weight:700}
</style>
