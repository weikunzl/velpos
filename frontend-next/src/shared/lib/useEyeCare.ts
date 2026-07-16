import { useState, useEffect, useCallback } from 'react'

const BRIGHTNESS_KEY = 'pf_eyecare_brightness'
const WARMTH_KEY = 'pf_eyecare_warmth'
const DEFAULT_BRIGHTNESS = 100
const DEFAULT_WARMTH = 0

function loadValue(key: string, fallback: number): number {
  /* v8 ignore next 9 */ if (typeof window === 'undefined') return fallback
  try {
    const v = localStorage.getItem(key)
    if (v !== null) {
      const n = Number(v)
      if (!Number.isNaN(n)) return n
    }
  } catch { /* ignore */ }
  return fallback
}

function applyFilterRaw(brightnessVal: number, warmthVal: number) {
  /* v8 ignore next 12 */ if (typeof window === 'undefined') return
  const el = document.documentElement
  const b = brightnessVal / 100
  const w = warmthVal / 100
  const s = w * 0.35
  const sat = 1 + w * 0.15

  if (brightnessVal === DEFAULT_BRIGHTNESS && warmthVal === DEFAULT_WARMTH) {
    el.style.removeProperty('filter')
    return
  }

  el.style.filter = `brightness(${b}) sepia(${s}) saturate(${sat})`
}

export function useEyeCare() {
  const [brightness, setBrightnessState] = useState(() => loadValue(BRIGHTNESS_KEY, DEFAULT_BRIGHTNESS))
  const [warmth, setWarmthState] = useState(() => loadValue(WARMTH_KEY, DEFAULT_WARMTH))

  useEffect(() => {
    applyFilterRaw(brightness, warmth)
    try { localStorage.setItem(BRIGHTNESS_KEY, String(brightness)) } catch { /* ignore */ }
  }, [brightness])

  useEffect(() => {
    applyFilterRaw(brightness, warmth)
    try { localStorage.setItem(WARMTH_KEY, String(warmth)) } catch { /* ignore */ }
  }, [warmth, brightness])

  const isActive = brightness !== DEFAULT_BRIGHTNESS || warmth !== DEFAULT_WARMTH

  const setBrightness = useCallback((v: number) => setBrightnessState(v), [])
  const setWarmth = useCallback((v: number) => setWarmthState(v), [])

  const reset = useCallback(() => {
    setBrightnessState(DEFAULT_BRIGHTNESS)
    setWarmthState(DEFAULT_WARMTH)
  }, [])

  return { brightness, setBrightness, warmth, setWarmth, isActive, reset }
}
