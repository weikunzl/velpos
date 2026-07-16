'use client'

import { useState, useCallback } from 'react'

const OTHER_LABEL = '__other__'

interface Question {
  question: string
  header?: string
  multiSelect?: boolean
  options?: Array<{ label: string; description?: string }>
}

interface Props {
  block: {
    input?: { questions?: Question[] }
    questions?: Question[]
    tool_name?: string
  }
  answered: boolean
  onAnswer: (data: { answers: Record<string, string> }) => void
}

export function UserChoiceBlock({ block, answered, onAnswer }: Props) {
  const [selections, setSelections] = useState<Record<string, string | string[]>>({})
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({})
  const questions = block.questions || block.input?.questions || []

  const hasBuiltinOther = useCallback((q: Question) => {
    return (q.options || []).some(opt => opt.label.toLowerCase() === 'other')
  }, [])

  const isOtherOpt = useCallback((opt: { label: string }) => {
    return opt.label.toLowerCase() === 'other'
  }, [])

  function toggleOption(qIdx: number, optLabel: string, multiSelect?: boolean) {
    const key = `q${qIdx}`
    setSelections(prev => {
      if (multiSelect) {
        const current = (prev[key] as string[]) || []
        if (current.includes(optLabel)) {
          return { ...prev, [key]: current.filter(l => l !== optLabel) }
        }
        return { ...prev, [key]: [...current, optLabel] }
      }
      return { ...prev, [key]: optLabel }
    })
  }

  function isSelected(qIdx: number, optLabel: string, multiSelect?: boolean): boolean {
    const key = `q${qIdx}`
    const val = selections[key]
    if (multiSelect) {
      return (val as string[] || []).includes(optLabel)
    }
    return val === optLabel
  }

  function isOtherSelected(qIdx: number, multiSelect?: boolean): boolean {
    return isSelected(qIdx, OTHER_LABEL, multiSelect)
  }

  function hasAnswered(qIdx: number): boolean {
    const key = `q${qIdx}`
    const val = selections[key]
    if (Array.isArray(val)) {
      if (val.length === 0) return false
      if (val.includes(OTHER_LABEL)) {
        return !!(otherTexts[key] || '').trim()
      }
      return true
    }
    if (val === OTHER_LABEL) {
      return !!(otherTexts[key] || '').trim()
    }
    return !!val
  }

  const allAnswered = questions.every((_, i) => hasAnswered(i))

  function submitAnswers() {
    const answers: Record<string, string> = {}
    questions.forEach((q, i) => {
      const key = `q${i}`
      const val = selections[key]
      if (Array.isArray(val)) {
        const resolved = val.map(v => v === OTHER_LABEL ? (otherTexts[key] || '').trim() : v)
        answers[q.question] = resolved.join(', ')
      } else if (val === OTHER_LABEL) {
        answers[q.question] = (otherTexts[key] || '').trim()
      } else {
        answers[q.question] = val || ''
      }
    })
    onAnswer({ answers })
  }

  if (questions.length === 0) return null

  return (
    <div className={`user-choice-block ${answered ? 'choice-answered' : ''}`}>
      <div className="choice-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>User Input Required</span>
      </div>

      {questions.map((q, qIdx) => (
        <div key={qIdx} className="question-group">
          {q.header && (
            <div className="question-header">
              <span className="question-chip">{q.header}</span>
            </div>
          )}
          <div className="question-text">{q.question}</div>

          <div className="options-list">
            {(q.options || []).map((opt, oIdx) => {
              if (!isOtherOpt(opt)) {
                return (
                  <button
                    key={oIdx}
                    className={`option-btn ${isSelected(qIdx, opt.label, q.multiSelect) ? 'option-selected' : ''} ${q.multiSelect ? 'option-multi' : ''}`}
                    disabled={answered}
                    onClick={() => toggleOption(qIdx, opt.label, q.multiSelect)}
                  >
                    <span className="option-indicator">
                      {q.multiSelect ? (
                        <span className="checkbox">
                          {isSelected(qIdx, opt.label, true) && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </span>
                      ) : (
                        <span className="radio">
                          {isSelected(qIdx, opt.label, false) && <span className="radio-dot" />}
                        </span>
                      )}
                    </span>
                    <span className="option-content">
                      <span className="option-label">{opt.label}</span>
                      {opt.description && <span className="option-desc">{opt.description}</span>}
                    </span>
                  </button>
                )
              }
              return null
            })}

            {(q.options || []).some(opt => isOtherOpt(opt)) && (
              <button
                className={`option-btn option-other ${isOtherSelected(qIdx, q.multiSelect) ? 'option-selected' : ''}`}
                disabled={answered}
                onClick={() => toggleOption(qIdx, OTHER_LABEL, q.multiSelect)}
              >
                <span className="option-indicator">
                  {q.multiSelect ? (
                    <span className="checkbox">
                      {isOtherSelected(qIdx, true) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </span>
                  ) : (
                    <span className="radio">
                      {isOtherSelected(qIdx, false) && <span className="radio-dot" />}
                    </span>
                  )}
                </span>
                <span className="option-content">
                  <span className="option-label">Other</span>
                  <span className="option-desc">{q.options?.find(o => isOtherOpt(o))?.description || 'Provide your own answer'}</span>
                </span>
              </button>
            )}

            {!hasBuiltinOther(q) && (
              <button
                className={`option-btn option-other ${isOtherSelected(qIdx, q.multiSelect) ? 'option-selected' : ''}`}
                disabled={answered}
                onClick={() => toggleOption(qIdx, OTHER_LABEL, q.multiSelect)}
              >
                <span className="option-indicator">
                  {q.multiSelect ? (
                    <span className="checkbox">
                      {isOtherSelected(qIdx, true) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </span>
                  ) : (
                    <span className="radio">
                      {isOtherSelected(qIdx, false) && <span className="radio-dot" />}
                    </span>
                  )}
                </span>
                <span className="option-content">
                  <span className="option-label">Other</span>
                  <span className="option-desc">Provide your own answer</span>
                </span>
              </button>
            )}
          </div>

          {isOtherSelected(qIdx, q.multiSelect) && !answered && (
            <div className="other-input-wrap">
              <textarea
                className="other-input"
                value={otherTexts[`q${qIdx}`] || ''}
                onChange={(e) => setOtherTexts(prev => ({ ...prev, [`q${qIdx}`]: e.target.value }))}
                placeholder="Type your answer here..."
                rows={2}
              />
            </div>
          )}
        </div>
      ))}

      {!answered && questions.length > 0 && (
        <button className="submit-btn" disabled={!allAnswered} onClick={submitAnswers}>
          Submit
        </button>
      )}
      {answered && <div className="answered-badge">Answered</div>}
    </div>
  )
}
