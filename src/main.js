import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './style.css'
import { watchInstall } from './stores/install.js'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {}))
}
watchInstall()
createApp(App).use(router).mount('#app')
