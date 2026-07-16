import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatToolbar } from '../ui/ChatToolbar'

const defaultProps = {
  sessionId: 's1',
  projectDir: '/test',
  projectId: 'p1',
  debugMode: false,
  runtimePanelVisible: false,
  isRunning: false,
  showClaudeControls: true,
  hasChannels: false,
  isBoundForSession: false,
  boundChannelType: '',
  boundInstanceName: '',
  currentAgentInfo: null,
  parallelBranchCount: 0,
  queryHistoryCount: 0,
  clearing: false,
  voiceSupported: false,
  videoSupported: false,
  onToggleDebug: vi.fn(),
  onToggleRuntime: vi.fn(),
  onToggleMediaMenu: vi.fn(),
  onOpenAgent: vi.fn(),
  onOpenPlugin: vi.fn(),
  onOpenMemory: vi.fn(),
  onOpenMultiSession: vi.fn(),
  onOpenCommandPalette: vi.fn(),
  onClear: vi.fn(),
  onToggleUsage: vi.fn(),
  onOpenIM: vi.fn(),
}

describe('ChatToolbar', () => {
  it('renders debug and runtime buttons', () => {
    render(<ChatToolbar {...defaultProps} />)
    const debugBtn = screen.getByLabelText(/Debug/)
    expect(debugBtn).toBeInTheDocument()
    expect(debugBtn).not.toHaveClass('toolbar-btn--active')

    const runtimeBtn = screen.getByLabelText(/Runtime/)
    expect(runtimeBtn).toBeInTheDocument()
  })

  it('highlights debug button when debug mode is on', () => {
    render(<ChatToolbar {...defaultProps} debugMode={true} />)
    expect(screen.getByLabelText(/Debug/)).toHaveClass('toolbar-btn--active')
  })

  it('renders Claude control buttons when showClaudeControls is true', () => {
    render(<ChatToolbar {...defaultProps} />)
    expect(screen.getByLabelText(/Select Agent/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Plugin management/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Multi-session/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Git branch/)).toBeInTheDocument()
  })

  it('hides Claude control buttons when showClaudeControls is false', () => {
    render(<ChatToolbar {...defaultProps} showClaudeControls={false} />)
    expect(screen.queryByLabelText(/Select Agent/)).toBeNull()
  })

  it('renders commands and usage buttons', () => {
    render(<ChatToolbar {...defaultProps} />)
    expect(screen.getByLabelText(/Command palette/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Usage/)).toBeInTheDocument()
  })

  it('calls onToggleDebug when debug button clicked', () => {
    const onToggleDebug = vi.fn()
    render(<ChatToolbar {...defaultProps} onToggleDebug={onToggleDebug} />)
    fireEvent.click(screen.getByLabelText(/Debug/))
    expect(onToggleDebug).toHaveBeenCalled()
  })

  it('calls onToggleRuntime when runtime button clicked', () => {
    const onToggleRuntime = vi.fn()
    render(<ChatToolbar {...defaultProps} onToggleRuntime={onToggleRuntime} />)
    fireEvent.click(screen.getByLabelText(/Runtime/))
    expect(onToggleRuntime).toHaveBeenCalled()
  })

  it('calls onOpenMultiSession when multi-session button clicked', () => {
    const onOpenMultiSession = vi.fn()
    render(<ChatToolbar {...defaultProps} onOpenMultiSession={onOpenMultiSession} />)
    fireEvent.click(screen.getByLabelText(/Multi-session/))
    expect(onOpenMultiSession).toHaveBeenCalled()
  })

  it('calls onToggleUsage when usage button clicked', () => {
    const onToggleUsage = vi.fn()
    render(<ChatToolbar {...defaultProps} onToggleUsage={onToggleUsage} />)
    fireEvent.click(screen.getByLabelText(/Usage/))
    expect(onToggleUsage).toHaveBeenCalled()
  })

  it('calls onOpenAgent when agent button clicked', () => {
    const onOpenAgent = vi.fn()
    render(<ChatToolbar {...defaultProps} onOpenAgent={onOpenAgent} />)
    fireEvent.click(screen.getByLabelText(/Select Agent/))
    expect(onOpenAgent).toHaveBeenCalled()
  })

  it('calls onOpenPlugin when plugin button clicked', () => {
    const onOpenPlugin = vi.fn()
    render(<ChatToolbar {...defaultProps} onOpenPlugin={onOpenPlugin} />)
    fireEvent.click(screen.getByLabelText(/Plugin management/))
    expect(onOpenPlugin).toHaveBeenCalled()
  })

  it('calls onOpenCommandPalette when commands button clicked', () => {
    const onOpenCommandPalette = vi.fn()
    render(<ChatToolbar {...defaultProps} onOpenCommandPalette={onOpenCommandPalette} />)
    fireEvent.click(screen.getByLabelText(/Command palette/))
    expect(onOpenCommandPalette).toHaveBeenCalled()
  })
})
