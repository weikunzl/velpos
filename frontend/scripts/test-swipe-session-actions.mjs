/** 移动端会话滑动操作区宽度逻辑（与 SessionListSwipeItem 一致） */
function getSwipeActionWidth({ active, source }) {
  const isClaudeCode = source === 'claude-code'
  const canCopy = !isClaudeCode
  const canDelete = !active
  const COPY_WIDTH = 72
  const DELETE_WIDTH = 72
  if (canCopy && canDelete) return COPY_WIDTH + DELETE_WIDTH
  if (canCopy) return COPY_WIDTH
  if (canDelete) return DELETE_WIDTH
  return 0
}

const cases = [
  { active: true, source: 'velpos', expect: 72, label: '当前 Velpos 会话仅复制' },
  { active: false, source: 'velpos', expect: 144, label: '非当前 Velpos 复制+删除' },
  { active: false, source: 'claude-code', expect: 72, label: '非当前 Claude Code 仅删除' },
  { active: true, source: 'claude-code', expect: 0, label: '当前 Claude Code 无滑动' },
]

let failed = 0
for (const c of cases) {
  const got = getSwipeActionWidth(c)
  if (got !== c.expect) {
    console.error(`FAIL: ${c.label} — expected ${c.expect}, got ${got}`)
    failed++
  } else {
    console.log(`OK: ${c.label}`)
  }
}

process.exit(failed > 0 ? 1 : 0)
