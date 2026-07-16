'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const BOTTOM_THRESHOLD = 150

export function useMessageListScroll(messageCount: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const isNearBottomRef = useRef(true)
  const scrollRafRef = useRef<number | null>(null)

  const checkNearBottom = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const nearBottom = distanceFromBottom < BOTTOM_THRESHOLD
    isNearBottomRef.current = nearBottom
    setShowScrollBtn(!nearBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    isNearBottomRef.current = true
    setShowScrollBtn(false)
  }, [])

  useEffect(() => {
    if (isNearBottomRef.current) {
      requestAnimationFrame(scrollToBottom)
    }
  }, [messageCount, scrollToBottom])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new MutationObserver(() => {
      if (!isNearBottomRef.current || scrollRafRef.current) return
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null
        scrollToBottom()
      })
    })

    observer.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
    }
  }, [scrollToBottom])

  return {
    containerRef,
    sentinelRef,
    showScrollBtn,
    loadingMore,
    setLoadingMore,
    checkNearBottom,
    scrollToBottom,
  }
}
