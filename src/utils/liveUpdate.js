// Decides whether the store app should replace its web bundle with the published one.
// `own` is the ota-version.json inside the running bundle; `latest` is ota/latest.json on the site.
export function shouldUpdate(own, latest) {
  if (!own?.version || !latest?.version || !latest.url) return false
  // A bundle built for a different native shell may call plugins this app does not have.
  if (own.nativeApi !== latest.nativeApi) return false
  return own.version !== latest.version
}
