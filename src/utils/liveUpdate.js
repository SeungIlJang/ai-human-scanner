// Decides whether the store app should replace its web bundle with the published one.
// `own` is the ota-version.json inside the running bundle; `latest` is ota/latest.json on the site.
export function shouldUpdate(own, latest) {
  if (!own?.version || !latest?.version || !latest.url) return false
  // A bundle built for a different native shell may call plugins this app does not have.
  if (own.nativeApi !== latest.nativeApi) return false
  return own.version !== latest.version
}

// What the home screen says about the update. An empty message means there is nothing to show.
export function updateMessage({ status, percent }) {
  if (status === 'downloading') {
    const known = Number.isFinite(percent) && percent >= 0 && percent <= 100
    return known ? `새 버전을 받는 중이에요… ${Math.round(percent)}%` : '새 버전을 받는 중이에요…'
  }
  if (status === 'applying') return '업데이트를 적용하는 중이에요. 잠시만 기다려 주세요.'
  if (status === 'ready') return '새 버전을 받았어요. 다음에 앱을 열 때 적용됩니다.'
  return ''
}
