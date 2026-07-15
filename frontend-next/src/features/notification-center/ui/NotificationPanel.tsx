'use client'

import { formatRelativeTime } from '@/shared/lib/formatTime'
import { useNotifications } from '../model/useNotifications'

interface Props {
  onNavigate: (sessionId: string) => void
  onClose: () => void
}

export default function NotificationPanel({ onNavigate, onClose }: Props) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  function handleClick(n: { id: number; sessionId: string }) {
    markAsRead(n.id)
    onNavigate(n.sessionId)
    onClose()
  }

  return (
    <div className="notification-panel">
      <div className="panel-header">
        <span className="panel-title">Notifications</span>
        {unreadCount > 0 && (
          <button className="mark-all-btn" onClick={markAllAsRead}>
            Mark all read
          </button>
        )}
      </div>
      <div className="panel-body">
        {notifications.length === 0 ? (
          <div className="empty-state">No notifications</div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`notification-item${!n.read ? ' unread' : ''}`}
              onClick={() => handleClick(n)}
            >
              {!n.read && <div className={`notification-dot ${n.type}`} />}
              <div className="notification-content">
                <div className={`notification-title ${n.type}`}>
                  {n.type === 'auth_required' ? 'Waiting for authorization' : 'Query completed'}
                </div>
                <div className="notification-meta">
                  <span className="session-id">{n.sessionId.slice(0, 8)}</span>
                  <span className="session-name">{n.sessionName}</span>
                  {n.projectName && <span className="project-name">{n.projectName}</span>}
                </div>
                <div className="notification-time">{formatRelativeTime(n.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
