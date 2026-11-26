<template><div><div class="app-shell"><header v-if="$route.path !== '/result' && $route.path !== '/camera' && $route.path !== '/analysis'" class="topbar" :class="{ 'home-topbar': $route.path === '/' }"><router-link class="brand" to="/" aria-label="홈으로"><span class="brand-icon">✳</span><span>AI HUMAN <b>SCANNER</b></span></router-link><span class="top-status"><i></i> ENTERTAINMENT MODE</span></header><main><router-view /></main><footer v-if="$route.path !== '/camera'">© AI HUMAN SCANNER · 모든 분석은 기기 안에서 진행됩니다.</footer></div></div></template>

<style scoped>
@media(max-width:760px){.home-topbar{justify-content:center}}
</style>
