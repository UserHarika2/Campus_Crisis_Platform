import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import { StatusBadge, PriorityBadge, formatCategory, formatDate } from '../components/Badges'
import { incidentsApi, type Incident } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function IncidentsListPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // Tab filter: 'all' | 'mine' | 'unassigned'
  const isMyTasksPath = location.pathname.includes('my-tasks')
  const isMyIncidentsPath = location.pathname.includes('my-incidents')
  
  const [scopeTab, setScopeTab] = useState<'all' | 'mine' | 'unassigned'>(
    isMyTasksPath || isMyIncidentsPath ? 'mine' : 'all'
  )

  useEffect(() => {
    incidentsApi.getAll()
      .then(r => setIncidents(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = incidents.filter(i => {
    // Scope Tab filter
    if (scopeTab === 'mine') {
      if (user?.role === 'TECHNICIAN' && i.assigned_to_id !== user?.id) return false
      if (user?.role === 'STUDENT' && i.reporter_id !== user?.id) return false
    } else if (scopeTab === 'unassigned') {
      if (i.assigned_to_id) return false
    }

    const matchText = filter === '' ||
      i.title.toLowerCase().includes(filter.toLowerCase()) ||
      i.location.toLowerCase().includes(filter.toLowerCase()) ||
      i.category.toLowerCase().includes(filter.toLowerCase())
    const matchStatus = statusFilter === '' || i.status === statusFilter
    return matchText && matchStatus
  })

  const statuses = ['', 'REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED', 'REOPENED']

  const getPageTitle = () => {
    if (isMyTasksPath || user?.role === 'TECHNICIAN') return 'Technician Tasks Queue'
    if (isMyIncidentsPath || user?.role === 'STUDENT') return 'My Reported Incidents'
    if (user?.role === 'OFFICER') return 'Crisis Dispatch Queue'
    return 'Campus Incidents Directory'
  }

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time campus issue tracking, technician allocation, and status management
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 w-fit">
            Showing <strong className="text-brand-600">{filtered.length}</strong> of {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Scope Tabs (Tailored to Role) */}
        <div className="flex gap-2 border-b border-slate-200/80 pb-2">
          {user?.role === 'TECHNICIAN' && (
            <>
              <button
                onClick={() => setScopeTab('mine')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  scopeTab === 'mine'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🔧 Assigned to Me ({incidents.filter(i => i.assigned_to_id === user.id).length})
              </button>
              <button
                onClick={() => setScopeTab('unassigned')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  scopeTab === 'unassigned'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ✋ Unassigned ({incidents.filter(i => !i.assigned_to_id).length})
              </button>
              <button
                onClick={() => setScopeTab('all')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  scopeTab === 'all'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Campus Incidents ({incidents.length})
              </button>
            </>
          )}

          {user?.role === 'STUDENT' && (
            <button
              onClick={() => setScopeTab('mine')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 text-white shadow-sm"
            >
              📢 My Reports ({incidents.filter(i => i.reporter_id === user.id).length})
            </button>
          )}

          {(user?.role === 'OFFICER' || user?.role === 'ADMIN' || user?.role === 'SECURITY') && (
            <>
              <button
                onClick={() => setScopeTab('all')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  scopeTab === 'all'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Incidents ({incidents.length})
              </button>
              <button
                onClick={() => setScopeTab('unassigned')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  scopeTab === 'unassigned'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ⚡ Needs Assignment ({incidents.filter(i => !i.assigned_to_id).length})
              </button>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              className="input pl-10"
              placeholder="Search by title, location, category…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              id="search-incidents"
            />
          </div>
          <div className="flex gap-2">
            <select
              className="input md:w-56 cursor-pointer"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              id="status-filter"
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s === '' ? 'All Statuses' : s.replace('_', ' ')}</option>
              ))}
            </select>
            {(filter || statusFilter) && (
              <button
                onClick={() => { setFilter(''); setStatusFilter(''); }}
                className="btn-secondary text-xs px-3 text-slate-500 hover:text-slate-800 shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading incidents queue…</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16 text-slate-500">
            <span className="text-4xl block mb-2">🔍</span>
            <p className="font-semibold text-slate-800">No matching incidents found</p>
            <p className="text-xs text-slate-400 mt-1">
              {scopeTab === 'mine' && user?.role === 'TECHNICIAN'
                ? "You do not have any tasks assigned to you right now. Check the 'Unassigned' tab to pick up tasks."
                : scopeTab === 'mine' && user?.role === 'STUDENT'
                ? "You haven't reported any incidents yet. Click 'Report Incident' in the sidebar to submit one."
                : "Try adjusting your search terms or status filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(inc => (
              <Link
                key={inc.id}
                to={`/incidents/${inc.id}`}
                className="card hover:border-brand-400 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between group p-5 gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                      #{inc.id}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200/60">
                      {formatCategory(inc.category)}
                    </span>
                    {inc.assigned_to_id === user?.id && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        Assigned to You
                      </span>
                    )}
                    {!inc.assigned_to_id && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                        Unassigned
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors text-base truncate">
                    {inc.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>📍 {inc.location}</span>
                    <span>•</span>
                    <span>🕒 {formatDate(inc.created_at)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <PriorityBadge priority={inc.priority} />
                  <StatusBadge status={inc.status} />
                  <span className="text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all font-bold text-sm">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
