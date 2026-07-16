import type { WsConnection } from '@/shared/api/wsClient'

export function useCancelQuery(wsConnection: WsConnection | null) {
  function cancelQuery(): boolean {
    if (!wsConnection || wsConnection.getReadyState() !== WebSocket.OPEN) {
      return false
    }

    return wsConnection.send({ action: 'cancel' })
  }

  return { cancelQuery }
}
