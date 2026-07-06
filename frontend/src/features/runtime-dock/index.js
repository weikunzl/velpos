export { default as RuntimeActionDock } from './ui/RuntimeActionDock.vue'
export {
  findLastUserMessage,
  findPendingInteractive,
  resolveQueuedPrompt,
  shouldShowQueuedBlock,
  queuedBlockMode,
  shouldHideMessageFromList,
  buildInteractiveBlock,
} from './lib/runtimeDockState.js'
