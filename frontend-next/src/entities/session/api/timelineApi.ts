import { get } from '@/shared/api/httpClient'
import type { TimelineEvent } from '@/shared/types/api'

export function fetchSessionTimelineEventsApi(
  sessionId: string,
  limit = 500,
  eventTypes: string[] = [],
): Promise<{ events: TimelineEvent[] }> {
  const query = new URLSearchParams()
  query.set('limit', String(limit))
  if (eventTypes.length) query.set('event_types', eventTypes.join(','))
  return get(`/sessions/${sessionId}/timeline-events?${query.toString()}`)
}
