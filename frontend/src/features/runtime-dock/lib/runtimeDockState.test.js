/**
 * Acceptance tests for runtime dock state helpers.
 * Run: node frontend/src/features/runtime-dock/lib/runtimeDockState.test.js
 */
import assert from 'node:assert/strict'
import {
  findLastUserMessage,
  findPendingInteractive,
  resolveQueuedPrompt,
  shouldShowQueuedBlock,
  queuedBlockMode,
  shouldHideMessageFromList,
  buildInteractiveBlock,
} from './runtimeDockState.js'

function testFindLastUserMessage() {
  const messages = [
    { type: 'assistant', content: {} },
    { type: 'user', content: { text: 'first' } },
    { type: 'user', content: { text: 'queued follow-up' } },
  ]
  assert.equal(findLastUserMessage(messages)?.content?.text, 'queued follow-up')
}

function testFindPendingInteractive() {
  const messages = [
    { type: 'interactive', content: { interaction_type: 'permission', tool_name: 'Bash' } },
  ]
  const pending = findPendingInteractive(messages)
  assert.equal(pending.content.tool_name, 'Bash')
}

function testQueuedBlockActive() {
  const messages = [{ type: 'user', content: { text: 'fix tests' } }]
  assert.equal(shouldShowQueuedBlock({
    queued: true,
    isRunning: true,
    recoveryQueued: null,
    queuedPrompt: 'fix tests',
    messages,
  }), true)
  assert.equal(queuedBlockMode({ queued: true, isRunning: true, recoveryQueued: null }), 'active')
}

function testHideQueuedUserMessage() {
  const messages = [
    { _id: 1, type: 'user', content: { text: 'fix tests' } },
  ]
  const hidden = shouldHideMessageFromList(messages[0], {
    queuedPrompt: 'fix tests',
    queued: true,
    isRunning: true,
    recoveryQueued: null,
    pendingInteractive: null,
    dockInteractiveAnswered: false,
    messages,
  })
  assert.equal(hidden, true)
}

function testHidePendingInteractiveUntilAnswered() {
  const interactive = { _id: 9, type: 'interactive', content: { interaction_type: 'user_choice', questions: [] } }
  const messages = [interactive]
  assert.equal(shouldHideMessageFromList(interactive, {
    queuedPrompt: '',
    queued: false,
    isRunning: true,
    recoveryQueued: null,
    pendingInteractive: interactive,
    dockInteractiveAnswered: false,
    messages,
  }), true)
  assert.equal(shouldHideMessageFromList(interactive, {
    queuedPrompt: '',
    queued: false,
    isRunning: true,
    recoveryQueued: null,
    pendingInteractive: interactive,
    dockInteractiveAnswered: true,
    messages,
  }), false)
}

function testBuildInteractiveFromRecovery() {
  const block = buildInteractiveBlock(null, {
    interaction_type: 'permission',
    tool_name: 'Write',
    tool_input: 'file.txt',
  })
  assert.equal(block.type, 'permission')
  assert.equal(block.tool_name, 'Write')
}

const tests = [
  testFindLastUserMessage,
  testFindPendingInteractive,
  testQueuedBlockActive,
  testHideQueuedUserMessage,
  testHidePendingInteractiveUntilAnswered,
  testBuildInteractiveFromRecovery,
]

for (const run of tests) {
  run()
}

console.log(`runtimeDockState: ${tests.length} tests passed`)
