import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeSwitcher from '../ThemeSwitcher'

// Mock useTheme
vi.mock('@/shared/lib/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    cycleTheme: vi.fn(),
    nextTheme: () => 'light' as const,
  }),
}))

describe('ThemeSwitcher', () => {
  it('renders a button with aria-label for next theme', () => {
    render(<ThemeSwitcher />)
    const btn = screen.getByRole('button')
    expect(btn).toBeInTheDocument()
    expect(btn.getAttribute('aria-label')).toBe('Switch to Light theme')
    expect(btn.getAttribute('data-theme-current')).toBe('dark')
  })

  it('renders svg icon inside button', () => {
    render(<ThemeSwitcher />)
    const btn = screen.getByRole('button')
    expect(btn.querySelector('svg')).toBeInTheDocument()
  })
})
