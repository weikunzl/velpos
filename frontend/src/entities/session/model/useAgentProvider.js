import { computed, toValue } from 'vue'
import {
  AGENT_PROVIDERS,
  resolveSessionProvider,
} from '@shared/lib/constants'

export function providerLabel(provider) {
  const found = AGENT_PROVIDERS.find((item) => item.id === provider)
  return found?.label || provider
}

export function useAgentProvider(sessionRef) {
  const provider = computed(() => resolveSessionProvider(toValue(sessionRef)))
  const isClaude = computed(() => provider.value === 'claude')
  const isCursor = computed(() => provider.value === 'cursor')
  const label = computed(() => providerLabel(provider.value))
  const showClaudeControls = computed(() => isClaude.value)

  return {
    provider,
    isClaude,
    isCursor,
    label,
    showClaudeControls,
  }
}
