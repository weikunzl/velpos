/**
 * Run: node frontend/src/features/command-palette/lib/slashCommandSuggest.test.js
 */
import assert from 'node:assert/strict'
import {
  buildSlashCommandInput,
  filterSlashCommandSuggestions,
  getSlashCommandContext,
} from './slashCommandSuggest.js'

const commands = [
  { name: 'demo-skill', type: 'skill', description: 'Demo skill', isUserInvocable: true },
  { name: 'review', type: 'skill', description: 'Review code', isUserInvocable: true },
  { name: 'demo', type: 'mcp', description: 'stdio MCP', isUserInvocable: false },
]

function testDetectsSlashAtLineStart() {
  const ctx = getSlashCommandContext('/de', 3)
  assert.ok(ctx)
  assert.equal(ctx.query, 'de')
  assert.equal(ctx.replaceStart, 0)
  assert.equal(ctx.replaceEnd, 3)
}

function testDetectsSlashAfterNewline() {
  const text = 'hello\n/rev'
  const ctx = getSlashCommandContext(text, text.length)
  assert.ok(ctx)
  assert.equal(ctx.query, 'rev')
  assert.equal(ctx.replaceStart, 6)
}

function testIgnoresSlashInMiddleOfLine() {
  assert.equal(getSlashCommandContext('say /demo', 9), null)
}

function testFiltersInvokableCommands() {
  const filtered = filterSlashCommandSuggestions(commands, 'de')
  assert.deepEqual(filtered.map((item) => item.name), ['demo-skill'])
}

function testBuildsReplacementInput() {
  const ctx = getSlashCommandContext('/de', 3)
  const next = buildSlashCommandInput('/de', ctx, 'demo-skill')
  assert.equal(next, '/demo-skill ')
}

for (const [name, fn] of Object.entries({
  testDetectsSlashAtLineStart,
  testDetectsSlashAfterNewline,
  testIgnoresSlashInMiddleOfLine,
  testFiltersInvokableCommands,
  testBuildsReplacementInput,
})) {
  fn()
  console.log(`ok - ${name}`)
}
