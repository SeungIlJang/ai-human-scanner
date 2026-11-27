import { CapacitorUpdater as updater } from '@capgo/capacitor-updater'
import router from '../router/index.js'
import { session } from '../stores/session.js'
import { update } from '../stores/update.js'
import { shouldUpdate } from '../utils/liveUpdate.js'

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
// Reloading is safe only while the user is on the home screen with nothing captured.
const onIdleHome = () => router.currentRoute.value.path === '/' && !session.image

// Runs only inside the store app. The native side is @capgo/capacitor-updater with autoUpdate off.
export async function startLiveUpdate() {
  // Must come first on every launch: without it the plugin rolls a new bundle back as broken.
  await updater.notifyAppReady()
  const read = (url, options) => fetch(url, options).then(response => response.ok ? response.json() : null)
  const [own, latest] = await Promise.all([
    read(`${import.meta.env.BASE_URL}ota-version.json`),
    read(`${__SITE_URL__}ota/latest.json`, { cache: 'no-store' })
  ])
  if (!shouldUpdate(own, latest)) return
  try {
    update.status = 'downloading'
    const progress = await updater.addListener('download', event => { update.percent = event?.percent ?? null })
    const bundle = await updater.download({ url: latest.url, version: latest.version })
    progress?.remove?.()
    if (onIdleHome()) {
      update.status = 'applying'
      // Leave the message on screen long enough to read, then check again that nothing was started.
      await wait(1200)
      // set() swaps the bundle and reloads the app. Nothing after it runs.
      if (onIdleHome()) return await updater.set({ id: bundle.id })
    }
    // In the middle of a scan: apply on the next launch or return from the background instead.
    await updater.next({ id: bundle.id })
    update.status = 'ready'
  } catch (error) {
    // A failed update is not the user's problem. The current bundle keeps working.
    update.status = 'idle'
    throw error
  }
}
