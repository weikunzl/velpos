/**
 * Run: node frontend/src/features/runtime-dock/lib/submitInteractiveResponse.test.js
 */
import assert from 'node:assert/strict'
import { submitInteractiveResponse } from './submitInteractiveResponse.js'

function createMockWs({ open = true, sendOk = true } = {}) {
  return {
    getReadyState: () => (open ? 1 : 3),
    send: () => sendOk,
  }
}

function testSubmitSuccessMarksAnswered() {
  const marked = []
  const pending = { _id: 42, type: 'interactive', content: {} }
  const ok = submitInteractiveResponse({
    wsConnection: createMockWs(),
    sessionId: 'sess-1',
    pendingMessage: pending,
    data: { decision: 'allow' },
    markAnswered: (sessionId, key) => marked.push([sessionId, key]),
  })
  assert.equal(ok, true)
  assert.deepEqual(marked, [['sess-1', '42']])
}

function testSubmitFailsWhenDisconnected() {
  const toasts = []
  const ok = submitInteractiveResponse({
    wsConnection: createMockWs({ open: false }),
    sessionId: 'sess-1',
    pendingMessage: { _id: 1 },
    data: { decision: 'allow' },
    markAnswered: () => assert.fail('should not mark answered'),
    showToast: (msg) => toasts.push(msg),
  })
  assert.equal(ok, false)
  assert.equal(toasts[0], 'Not connected')
}

function testSubmitFailsWhenSendReturnsFalse() {
  const toasts = []
  const ok = submitInteractiveResponse({
    wsConnection: createMockWs({ sendOk: false }),
    sessionId: 'sess-1',
    pendingMessage: { _id: 1 },
    data: { decision: 'deny' },
    markAnswered: () => assert.fail('should not mark answered'),
    showToast: (msg) => toasts.push(msg),
  })
  assert.equal(ok, false)
  assert.equal(toasts[0], 'Connection lost, response not sent')
}

const tests = [
  testSubmitSuccessMarksAnswered,
  testSubmitFailsWhenDisconnected,
  testSubmitFailsWhenSendReturnsFalse,
]

for (const run of tests) {
  run()
}

console.log(`submitInteractiveResponse: ${tests.length} tests passed`)
