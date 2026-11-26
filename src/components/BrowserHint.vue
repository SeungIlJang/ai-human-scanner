<script setup>
// Links shared in KakaoTalk open in its in-app browser, where the camera can be blocked.
const inKakao = /KAKAOTALK/i.test(navigator.userAgent)
const externalUrl = `kakaotalk://web/openExternal?url=${encodeURIComponent(location.href.split('#')[0])}`
</script>

<template>
  <div v-if="inKakao" class="browser-hint">
    <p>카카오톡 안에서는 카메라가 막힐 수 있어요.</p>
    <a class="btn browser-btn" :href="externalUrl">기본 브라우저로 열기</a>
  </div>
</template>

<style scoped>
.browser-hint{margin:14px auto 0;padding:12px;max-width:420px;border:1px dashed #3f7b6b;border-radius:12px;background:#0f2527;text-align:center}
.browser-hint p{margin:0;color:#c9dde4;font-size:13px;line-height:1.5;word-break:keep-all}
.browser-btn{margin-top:8px;min-height:42px;padding:0 18px;background:#102736;border-color:#00ffaa;color:#6af3c8;font-size:14px;font-weight:700}
</style>
