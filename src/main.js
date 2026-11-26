import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './style.css'

// The native bridge defines window.Capacitor before any page script runs.
const inStoreApp = window.Capacitor?.isNativePlatform?.() === true

if (inStoreApp) {
  // The store app updates its bundle over the air. A failed check must never stop the app.
  import('./services/liveUpdate.js').then(({ startLiveUpdate }) => startLiveUpdate()).catch(() => {})
} else if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // The web app caches itself with a service worker. The store app must not, or it would keep serving an old bundle.
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {}))
}
createApp(App).use(router).mount('#app')
