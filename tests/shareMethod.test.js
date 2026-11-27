import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseShareMethod, isShareCancel } from '../src/utils/shareMethod.js'

test('the store app always uses the native share sheet, even where the WebView has no navigator.share', () => {
  assert.equal(chooseShareMethod({ inStoreApp: true, hasFile: false, canWebShare: false }), 'native')
  assert.equal(chooseShareMethod({ inStoreApp: true, hasFile: true, canWebShareFile: false }), 'native')
  assert.equal(chooseShareMethod({ inStoreApp: true, hasFile: false, canWebShare: true }), 'native')
})

test('the website uses the browser share sheet and falls back when there is none', () => {
  assert.equal(chooseShareMethod({ inStoreApp: false, hasFile: false, canWebShare: true }), 'web')
  assert.equal(chooseShareMethod({ inStoreApp: false, hasFile: false, canWebShare: false }), 'copy')
  assert.equal(chooseShareMethod({ inStoreApp: false, hasFile: true, canWebShareFile: true }), 'web')
  // A browser that can share text but not files must not be handed a file.
  assert.equal(chooseShareMethod({ inStoreApp: false, hasFile: true, canWebShare: true, canWebShareFile: false }), 'download')
})

test('closing the share sheet is not reported as a failure, on the web or in the app', () => {
  assert.equal(isShareCancel(Object.assign(new Error('x'), { name: 'AbortError' })), true)
  assert.equal(isShareCancel(new Error('Share canceled')), true)
  assert.equal(isShareCancel(new Error('Share cancelled by user')), true)
  assert.equal(isShareCancel(new Error('Can not write file')), false)
  assert.equal(isShareCancel(undefined), false)
})
