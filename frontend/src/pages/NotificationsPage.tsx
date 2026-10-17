import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { notificationsApi, type Notification } from '../lib/api'
import { formatDate } from '../components/Badges'
import { Link } from 'react-router-dom'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => notificationsApi.getAll()
    .then(r => setNotifications(r.data))
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const markRead = async (id: number) => {
    await notificationsApi.markRead(id)
    load()
  }

  const markAllRead = async () => {
    await notificationsApi.markAllRead()
    load()
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <Layout>
      <div className="max-w-3xl space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">System Notifications</h1>
            <p className="text-slate-500 text-xs mt-1">
              Real-time observer alerts triggered by incident status and assignment updates
            </p>
          </div>
          {unread > 0 && (
            <button 
              onClick={markAllRead} 
              className="btn-secondary text-xs py-2 px-3.5 self-start sm:self-center" 
              id="mark-all-read-btn"
            >
              ✓ Mark all as read ({unread})
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading notifications…</div>
        ) : notifications.length === 0 ? (
          <div className="card text-center py-16 text-slate-500">
            <span className="text-4xl block mb-2">🔔</span>
            <p className="font-semibold text-slate-800">You're all caught up!</p>
            <p className="text-xs text-slate-400 mt-1">Notifications will automatically appear here as incidents change state.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`card p-4 flex items-start gap-3.5 transition-all duration-200 ${
                  !n.is_read 
                    ? 'border-brand-300 bg-brand-50/30 shadow-sm' 
                    : 'bg-white hover:bg-slate-50/50'
                }`}
              >
                <div 
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    n.is_read ? 'bg-slate-300' : 'bg-brand-600 animate-pulse ring-4 ring-brand-100'
                  }`} 
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.is_read ? 'text-slate-700' : 'text-slate-900 font-semibold'}`}>
                    {n.message}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span className="text-slate-400">{formatDate(n.created_at)}</span>
                    <span className="text-slate-300">•</span>
                    <Link
                      to={`/incidents/${n.incident_id}`}
                      className="font-semibold text-brand-600 hover:text-brand-800 transition-colors"
                    >
                      View Incident #{n.incident_id} →
                    </Link>
                  </div>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-xs font-medium text-slate-400 hover:text-brand-600 shrink-0 transition-colors px-2 py-1 rounded hover:bg-slate-100"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
