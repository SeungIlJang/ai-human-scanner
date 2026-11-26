// True inside the store app (Capacitor's native WebView), false on the website.
// These are the same signals @capacitor/core uses: the bridge objects that the native shell injects before
// any page script runs. `Capacitor.isNativePlatform` cannot be used here because @capacitor/core adds it,
// and that library is only loaded after this check says we are in the app.
export function isStoreApp(win) {
  return Boolean(win?.androidBridge || win?.webkit?.messageHandlers?.bridge || win?.Capacitor?.isNativePlatform?.())
}
