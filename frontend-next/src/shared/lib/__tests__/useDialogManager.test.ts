import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, render } from '@testing-library/react'
import { useDialogManager } from '../useDialogManager'

describe('useDialogManager', () => {
  it('registers and unregisters dialogs', () => {
    const { result } = renderHook(() => useDialogManager())
    const ref = { current: true }
    result.current.registerDialog('test', ref as React.MutableRefObject<boolean | undefined>)
    expect(result.current.hasOpenDialogs()).toBe(true)
    result.current.unregisterDialog('test')
    expect(result.current.hasOpenDialogs()).toBe(false)
  })

  it('closeTopmostDialog closes the last registered open dialog', () => {
    const { result } = renderHook(() => useDialogManager())
    const ref1 = { current: true }
    const ref2 = { current: true }
    result.current.registerDialog('a', ref1 as React.MutableRefObject<boolean | undefined>)
    result.current.registerDialog('b', ref2 as React.MutableRefObject<boolean | undefined>)
    const closed = result.current.closeTopmostDialog()
    expect(closed).toBe(true)
    expect(ref1.current).toBe(true)
    expect(ref2.current).toBe(false)
  })

  it('closeTopmostDialog returns false when no open dialogs', () => {
    const { result } = renderHook(() => useDialogManager())
    const ref = { current: false }
    result.current.registerDialog('a', ref as React.MutableRefObject<boolean | undefined>)
    expect(result.current.closeTopmostDialog()).toBe(false)
  })

  it('hasOpenDialogs returns false when no dialogs', () => {
    const { result } = renderHook(() => useDialogManager())
    expect(result.current.hasOpenDialogs()).toBe(false)
  })

  it('useDialog registers and cleans up on unmount', () => {
    function TestComponent({ dialogKey }: { dialogKey: string }) {
      const { useDialog, hasOpenDialogs, dialogRegistry } = useDialogManager()
      const ref = React.useRef(true)
      useDialog(dialogKey, ref)
      return React.createElement('div', { 'data-testid': 'has-dialogs' }, String(hasOpenDialogs()))
    }
    const { unmount, getByTestId } = render(React.createElement(TestComponent, { dialogKey: 'test' }))
    expect(getByTestId('has-dialogs').textContent).toBe('true')
    unmount()
  })
})
