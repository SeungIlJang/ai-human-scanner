import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldUpdate, updateMessage } from '../src/utils/liveUpdate.js'

const own = { version: 'aaa', nativeApi: 1 }
const url = 'https://example.com/ota/bundle-bbb.zip'

test('the store app updates only to a different bundle built for the same native shell', () => {
  assert.equal(shouldUpdate(own, { version: 'bbb', nativeApi: 1, url }), true)
  assert.equal(shouldUpdate(own, { version: 'aaa', nativeApi: 1, url }), false)
  assert.equal(shouldUpdate(own, { version: 'bbb', nativeApi: 2, url }), false)
})

test('a missing or incomplete version file never triggers an update', () => {
  assert.equal(shouldUpdate(null, { version: 'bbb', nativeApi: 1, url }), false)
  assert.equal(shouldUpdate(own, null), false)
  assert.equal(shouldUpdate(own, { version: 'bbb', nativeApi: 1 }), false)
  assert.equal(shouldUpdate({ nativeApi: 1 }, { version: 'bbb', nativeApi: 1, url }), false)
})

test('the home screen says what the update is doing, and nothing when there is no update', () => {
  assert.equal(updateMessage({ status: 'idle', percent: null }), '')
  assert.match(updateMessage({ status: 'downloading', percent: 41.6 }), /받는 중.*42%/)
  // The plugin may not report progress, or may report something unusable.
  for (const percent of [null, undefined, NaN, -5, 250]) assert.equal(updateMessage({ status: 'downloading', percent }), '새 버전을 받는 중이에요…')
  assert.match(updateMessage({ status: 'applying', percent: 100 }), /적용하는 중/)
  assert.match(updateMessage({ status: 'ready', percent: 100 }), /다음에 앱을 열 때/)
})

test('the store app is recognized by the bridge the native shell injects, before Capacitor\'s library loads', async () => {
  const { isStoreApp } = await import('../src/utils/platform.js')
  assert.equal(isStoreApp({ androidBridge: {} }), true, 'Android WebView')
  assert.equal(isStoreApp({ webkit: { messageHandlers: { bridge: {} } } }), true, 'iOS WKWebView')
  // The injected Capacitor object has no isNativePlatform until @capacitor/core runs.
  assert.equal(isStoreApp({ androidBridge: {}, Capacitor: {} }), true)
  assert.equal(isStoreApp({ Capacitor: { isNativePlatform: () => true } }), true)
  // A browser: Safari has webkit.messageHandlers without Capacitor's bridge handler.
  assert.equal(isStoreApp({}), false)
  assert.equal(isStoreApp({ webkit: { messageHandlers: {} } }), false)
  assert.equal(isStoreApp({ Capacitor: { isNativePlatform: () => false } }), false)
})
