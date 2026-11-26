// vite.config.js replaces both ids at build time.
const APP_CACHE = 'ai-human-scanner-app-__BUILD_ID__'
const RUNTIME_CACHE = 'ai-human-scanner-runtime-__RUNTIME_ID__'
const root = new URL(self.registration.scope)
const isRuntimeFile = url => ['models/', 'wasm/'].some(dir => url.pathname.startsWith(root.pathname + dir))
self.addEventListener('install', event => {
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll([root.href, new URL('manifest.webmanifest', root).href, new URL('icons/icon.svg', root).href])))
  self.skipWaiting()
})
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(key => key !== APP_CACHE && key !== RUNTIME_CACHE).map(key => caches.delete(key)))), self.clients.claim()]))
})
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(APP_CACHE).then(cache => cache.put(root.href, copy))) }
      return response
    }).catch(() => caches.match(root.href)))
    return
  }
  const cacheName = isRuntimeFile(url) ? RUNTIME_CACHE : APP_CACHE
  event.respondWith(caches.match(request).then(hit => hit || fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(cacheName).then(cache => cache.put(request, copy))) }
    return response
  })))
})
