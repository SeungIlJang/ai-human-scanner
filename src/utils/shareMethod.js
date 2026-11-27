// Picks how a result is sent. Android's WebView has no navigator.share, so the store app must use the
// native share sheet; the website uses the browser's, and falls back when the browser has none.
export function chooseShareMethod({ inStoreApp, hasFile, canWebShare, canWebShareFile }) {
  if (inStoreApp) return 'native'
  if (hasFile) return canWebShareFile ? 'web' : 'download'
  return canWebShare ? 'web' : 'copy'
}

// Closing the share sheet is a choice, not a failure. Browsers report it as AbortError,
// Capacitor's Share plugin as an error whose message says the share was canceled.
export function isShareCancel(error) {
  return error?.name === 'AbortError' || /cancel/i.test(error?.message ?? '')
}
