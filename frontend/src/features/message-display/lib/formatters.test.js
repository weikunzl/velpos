/**
 * Run: node frontend/src/features/message-display/lib/formatters.test.js
 */
import assert from 'node:assert/strict'
import {
  formatInput,
  formatToolDisplayName,
  formatToolValue,
  toolInputSummary,
  toolBlockHasDetails,
} from './formatters.js'

function testToolInputSummaryFromPath() {
  assert.equal(toolInputSummary({ path: 'README.md' }), 'README.md')
}

function testToolInputSummaryFromLocations() {
  assert.equal(
    toolInputSummary({}, { locations: [{ uri: 'file://src/app/App.vue' }] }),
    'src/app/App.vue',
  )
}

function testToolInputSummaryFromScalarValue() {
  assert.equal(toolInputSummary({ value: 'pattern' }), 'pattern')
}

function testToolBlockHasDetails() {
  assert.equal(toolBlockHasDetails({ input: {} }), false)
  assert.equal(toolBlockHasDetails({ input: { path: 'a.txt' } }), true)
  assert.equal(toolBlockHasDetails({ output: 'hello' }), true)
  assert.equal(toolBlockHasDetails({ locations: [{ path: 'a.txt' }] }), true)
}

function testFormatToolValue() {
  assert.equal(formatToolValue('hello'), 'hello')
  assert.equal(formatToolValue({ path: 'a.txt' }), formatInput({ path: 'a.txt' }))
}

function testFormatToolDisplayNameForMcp() {
  assert.equal(formatToolDisplayName('CallMcpTool'), 'MCP · call')
  assert.equal(formatToolDisplayName('mcp_plugin-figma_search'), 'MCP · plugin / figma / search')
}

function testToolInputSummaryForMcpCall() {
  assert.equal(
    toolInputSummary({ server: 'figma', toolName: 'search' }),
    'figma · search',
  )
}

const tests = [
  testToolInputSummaryFromPath,
  testToolInputSummaryFromLocations,
  testToolInputSummaryFromScalarValue,
  testToolBlockHasDetails,
  testFormatToolValue,
  testFormatToolDisplayNameForMcp,
  testToolInputSummaryForMcpCall,
]

for (const test of tests) {
  test()
}

console.log(`formatters.test.js: ${tests.length} passed`)
