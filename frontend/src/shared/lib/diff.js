function hashString(value) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}

export function createDiffRow(type, beforeLine, afterLine, beforeLineNo, afterLineNo, phase = 'stable') {
  const source = `${type}:${beforeLineNo || 0}:${afterLineNo || 0}:${beforeLine}:${afterLine}`
  const displayLine = afterLineNo ? afterLine : beforeLine
  const displayLineNo = afterLineNo || beforeLineNo
  return {
    id: `${type}-${beforeLineNo || 0}-${afterLineNo || 0}-${hashString(source)}`,
    type,
    phase,
    beforeLine,
    afterLine,
    beforeLineNo,
    afterLineNo,
    displayLine,
    displayLineNo,
  }
}

export function splitLines(content) {
  return (content || '').split('\n')
}

function buildSequentialDiff(before, after) {
  const rows = []
  const max = Math.max(before.length, after.length)
  for (let index = 0; index < max; index += 1) {
    const beforeLine = before[index]
    const afterLine = after[index]
    if (beforeLine === afterLine) {
      rows.push(createDiffRow('same', beforeLine || '', afterLine || '', index + 1, index + 1))
    } else {
      if (beforeLine !== undefined) rows.push(createDiffRow('removed', beforeLine, '', index + 1, null))
      if (afterLine !== undefined) rows.push(createDiffRow('added', '', afterLine, null, index + 1))
    }
  }
  return rows
}

export function buildSideBySideDiff(before, after) {
  if (before.length * after.length > 1000000) return buildSequentialDiff(before, after)
  const rows = []
  const dp = Array.from({ length: before.length + 1 }, () => new Uint32Array(after.length + 1))

  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      dp[i][j] = before[i] === after[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  let i = 0
  let j = 0
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      rows.push(createDiffRow('same', before[i], after[j], i + 1, j + 1))
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push(createDiffRow('removed', before[i], '', i + 1, null))
      i += 1
    } else {
      rows.push(createDiffRow('added', '', after[j], null, j + 1))
      j += 1
    }
  }

  while (i < before.length) {
    rows.push(createDiffRow('removed', before[i], '', i + 1, null))
    i += 1
  }
  while (j < after.length) {
    rows.push(createDiffRow('added', '', after[j], null, j + 1))
    j += 1
  }

  return rows
}
