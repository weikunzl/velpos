import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeSwitcher from '../ThemeSwitcher'

const setTheme = vi.fn()
const setBrightness = vi.fn()
const setWarmth = vi.fn()
const reset = vi.fn()

vi.mock('@/shared/lib/useTheme', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme,
  }),
}))

vi.mock('@/shared/lib/useEyeCare', () => ({
  useEyeCare: () => ({
    brightness: 100,
    setBrightness,
    warmth: 0,
    setWarmth,
    reset,
  }),
}))

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    setTheme.mockClear()
    setBrightness.mockClear()
    setWarmth.mockClear()
    reset.mockClear()
  })

  it('renders three theme radio buttons', () => {
    render(<ThemeSwitcher />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(screen.getByTitle('Dark')).toBeInTheDocument()
    expect(screen.getByTitle('Light')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTitle('护眼')).toBeInTheDocument()
  })

  it('switches theme when clicking a different option', () => {
    render(<ThemeSwitcher />)
    fireEvent.click(screen.getByTitle('Dark'))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('toggles eyecare panel when clicking the active theme', () => {
    render(<ThemeSwitcher />)
    expect(screen.queryByLabelText('亮度')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Light'))
    expect(screen.getByLabelText('亮度')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Light'))
    expect(screen.queryByLabelText('亮度')).not.toBeInTheDocument()
  })
})
