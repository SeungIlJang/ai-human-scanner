import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './style.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {}))
}
createApp(App).use(router).mount('#app')
