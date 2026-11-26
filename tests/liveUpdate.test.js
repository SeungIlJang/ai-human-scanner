import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldUpdate } from '../src/utils/liveUpdate.js'

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
