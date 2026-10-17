import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { StatusBadge, PriorityBadge, formatCategory } from '../components/Badges'
import { incidentsApi, notificationsApi, type Incident } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function StatCard({ 
  label, 
  value, 
  color, 
  icon,
  badge 
}: { 
  label: string
  value: number
  color: string
  icon: string
  badge?: string 
}) {
  return (
    <div className="card hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl p-2 bg-slate-50 rounded-xl border border-slate-100">{icon}</span>
        {badge && (
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className={`text-3xl font-extrabold tracking-tight ${color}`}>{value}</p>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      incidentsApi.getAll(),
      notificationsApi.getUnreadCount(),
    ]).then(([inc, notif]) => {
      setIncidents(inc.data)
      setUnread(notif.data.unread_count)
    }).finally(() => setLoading(false))
  }, [])

  const open = incidents.filter(i => ['REPORTED', 'ASSIGNED', 'IN_PROGRESS'].includes(i.status)).length
  const critical = incidents.filter(i => i.priority === 'CRITICAL').length

  const recent = incidents.slice().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 5)

  return (
    <Layout>
      <div className="space-y-8 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
              <span>📅</span>
              <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="text-slate-300">•</span>
              <span className="text-brand-600 font-medium">Incident Command Center</span>
            </p>
          </div>
          {user?.role === 'STUDENT' && (
            <Link to="/report" className="btn-primary shrink-0">
              📢 Report New Incident
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Incidents" value={incidents.length} color="text-slate-900" icon="📊" badge="All time" />
          <StatCard label="Open / Active" value={open} color="text-blue-600" icon="⏳" badge="Pending" />
          <StatCard label="Critical Priority" value={critical} color="text-red-600" icon="🚨" badge="Urgent" />
          <StatCard label="Unread Alerts" value={unread} color="text-brand-600" icon="🔔" badge="Updates" />
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span>⚡</span>
            <span>Quick Actions</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {user?.role === 'STUDENT' && (
              <>
                <Link to="/report" className="btn-primary text-sm">
                  📢 Report an Incident
                </Link>
                <Link to="/my-incidents" className="btn-secondary text-sm">
                  📋 My Reported Incidents
                </Link>
              </>
            )}
            {user?.role === 'TECHNICIAN' && (
              <>
                <Link to="/my-tasks" className="btn-primary text-sm">
                  🔧 View My Assigned Tasks
                </Link>
                <Link to="/incidents" className="btn-secondary text-sm">
                  📋 View All Incidents Queue
                </Link>
              </>
            )}
            {user?.role === 'OFFICER' && (
              <>
                <Link to="/incidents" className="btn-primary text-sm">
                  📋 Open Incident Dispatch Queue
                </Link>
              </>
            )}
            {user?.role === 'ADMIN' && (
              <>
                <Link to="/incidents" className="btn-primary text-sm">
                  📋 View Incidents Queue
                </Link>
                <Link to="/analytics" className="btn-secondary text-sm">
                  📊 Analytics
                </Link>
                <Link to="/users" className="btn-secondary text-sm">
                  👥 Users
                </Link>
              </>
            )}
            <Link to="/notifications" className="btn-secondary text-sm">
              🔔 Notifications {unread > 0 && <span className="ml-1 px-1.5 py-0.2 bg-brand-100 text-brand-700 rounded-full font-bold text-xs">{unread}</span>}
            </Link>
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent Incidents</h2>
              <p className="text-xs text-slate-500 mt-0.5">Most recently reported campus events</p>
            </div>
            <Link to="/incidents" className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1">
              <span>View all incidents</span>
              <span>→</span>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading recent incidents…</div>
          ) : recent.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-3xl block mb-2">🎉</span>
              <p className="font-medium text-slate-600">No active incidents reported.</p>
              {user?.role === 'STUDENT' && (
                <p className="text-xs text-slate-400 mt-1">
                  Need assistance?{' '}
                  <Link to="/report" className="text-brand-600 hover:underline font-semibold">Report one now</Link>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {recent.map(inc => (
                <Link
                  key={inc.id}
                  to={`/incidents/${inc.id}`}
                  className="flex items-center justify-between p-4 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200/80 hover:border-brand-300 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                      {inc.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">{formatCategory(inc.category)}</span>
                      <span>•</span>
                      <span>📍 {inc.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <PriorityBadge priority={inc.priority} />
                    <StatusBadge status={inc.status} />
                    <span className="text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all text-sm ml-1 font-bold">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
