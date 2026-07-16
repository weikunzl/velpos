export { RuntimeActionDock } from './ui/RuntimeActionDock'
export {
  findLastUserMessage,
  findPendingInteractive,
  resolveQueuedPrompt,
  shouldShowQueuedBlock,
  queuedBlockMode,
  messageKey,
  isInteractiveAnswered,
  shouldHideMessageFromList,
  buildInteractiveBlock,
} from './lib/runtimeDockState'
export { submitInteractiveResponse } from './lib/submitInteractiveResponse'
