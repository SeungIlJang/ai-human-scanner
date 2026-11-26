import { registerPlugin } from '@capacitor/core'
import { shouldUpdate } from '../utils/liveUpdate.js'

// Runs only inside the store app. The native side is @capgo/capacitor-updater with autoUpdate off.
export async function startLiveUpdate() {
  const updater = registerPlugin('CapacitorUpdater')
  // Must come first on every launch: without it the plugin rolls a new bundle back as broken.
  await updater.notifyAppReady()
  const read = (url, options) => fetch(url, options).then(response => response.ok ? response.json() : null)
  const [own, latest] = await Promise.all([
    read(`${import.meta.env.BASE_URL}ota-version.json`),
    read(`${__SITE_URL__}ota/latest.json`, { cache: 'no-store' })
  ])
  if (!shouldUpdate(own, latest)) return
  const bundle = await updater.download({ url: latest.url, version: latest.version })
  // Apply on the next launch or return from the background, never in the middle of a scan.
  await updater.next({ id: bundle.id })
}
