import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { incidentsApi, type Analytics } from '../lib/api'

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-slate-600 w-28 shrink-0 text-right truncate">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/60 p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-900 w-8 text-right font-mono">{value}</span>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    incidentsApi.getAnalytics()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><div className="text-center py-20 text-slate-400">Loading incident metrics…</div></Layout>
  if (!data) return <Layout><div className="text-center py-20 text-rose-600 font-semibold">Failed to load analytics data.</div></Layout>

  const catMax = Math.max(...Object.values(data.by_category), 1)
  const statusMax = Math.max(...Object.values(data.by_status), 1)
  const prioMax = Math.max(...Object.values(data.by_priority), 1)

  const catColors = [
    'bg-brand-500', 
    'bg-indigo-500', 
    'bg-sky-500', 
    'bg-emerald-500', 
    'bg-amber-500', 
    'bg-purple-500', 
    'bg-rose-500'
  ]
  const statusColor: Record<string, string> = {
    REPORTED: 'bg-sky-500', 
    ASSIGNED: 'bg-indigo-500', 
    IN_PROGRESS: 'bg-purple-500',
    RESOLVED: 'bg-emerald-500', 
    CLOSED: 'bg-slate-400', 
    ESCALATED: 'bg-rose-500', 
    REOPENED: 'bg-amber-500',
  }
  const prioColor: Record<string, string> = {
    CRITICAL: 'bg-rose-500', 
    HIGH: 'bg-orange-500', 
    MEDIUM: 'bg-amber-500', 
    LOW: 'bg-emerald-500',
  }

  return (
    <Layout>
      <div className="space-y-8 animate-slide-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">Analytics & Operational Metrics</h1>
          <p className="text-slate-500 text-xs mt-1">Real-time incident response volume, state distribution, and lifecycle performance</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[
            { label: 'Total Volume', value: data.total_incidents, color: 'text-slate-900', border: 'border-l-4 border-l-slate-400' },
            { label: 'Open Incidents', value: data.open_incidents, color: 'text-sky-600', border: 'border-l-4 border-l-sky-500' },
            { label: 'Resolved', value: data.resolved_incidents, color: 'text-emerald-600', border: 'border-l-4 border-l-emerald-500' },
            { label: 'Closed Archive', value: data.closed_incidents, color: 'text-slate-500', border: 'border-l-4 border-l-slate-400' },
            { label: 'Critical Escalated', value: data.critical_incidents, color: 'text-rose-600', border: 'border-l-4 border-l-rose-500' },
            { label: 'Active Escalation', value: data.escalated_incidents, color: 'text-orange-600', border: 'border-l-4 border-l-orange-500' },
          ].map(s => (
            <div key={s.label} className={`card ${s.border} p-4 flex flex-col justify-between`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
              <p className={`text-3xl font-extrabold tracking-tight mt-2 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* By Status */}
          <div className="card">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Distribution by Status</h2>
              <p className="text-xs text-slate-500 mt-0.5">Active lifecycle phases across platform</p>
            </div>
            <div className="space-y-3">
              {Object.entries(data.by_status).map(([s, c]) => (
                <Bar key={s} label={s.replace('_', ' ')} value={c} max={statusMax} color={statusColor[s] ?? 'bg-slate-400'} />
              ))}
            </div>
          </div>

          {/* By Category */}
          <div className="card">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Breakdown by Category</h2>
              <p className="text-xs text-slate-500 mt-0.5">Incident volume across campus service areas</p>
            </div>
            <div className="space-y-3">
              {Object.entries(data.by_category).map(([cat, count], i) => (
                <Bar key={cat} label={cat} value={count} max={catMax} color={catColors[i % catColors.length]} />
              ))}
            </div>
          </div>

          {/* By Priority */}
          <div className="card">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Breakdown by Priority</h2>
              <p className="text-xs text-slate-500 mt-0.5">Incident severity classification</p>
            </div>
            <div className="space-y-3">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
                <Bar key={p} label={p} value={data.by_priority[p] ?? 0} max={prioMax} color={prioColor[p]} />
              ))}
            </div>
          </div>
        </div>

        {/* Design Patterns Active in This System */}
        <div className="card">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900">Software Architecture Patterns Active</h2>
            <p className="text-xs text-slate-500 mt-0.5">Gang-of-Four object-oriented design patterns powering this platform</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {[
              { name: 'Factory Method', desc: 'Category-driven incident polymorphic instantiation', icon: '🏭' },
              { name: 'Strategy Pattern', desc: 'Plug-and-play technician allocation algorithms', icon: '♟️' },
              { name: 'Chain of Resp.', desc: 'Multi-tiered severity escalation resolution hierarchy', icon: '⛓️' },
              { name: 'State Pattern', desc: 'Controlled incident lifecycle state transitions & guards', icon: '🔄' },
              { name: 'Observer Pattern', desc: 'Automated real-time event notifications on mutations', icon: '👁️' },
              { name: 'Facade Pattern', desc: 'Unified report_incident() coordinator API entry point', icon: '🏛️' },
              { name: 'Adapter Pattern', desc: 'Pluggable third-party SMS/Webhook notification provider bridge', icon: '🔌' },
            ].map(p => (
              <div 
                key={p.name} 
                className="bg-slate-50/80 hover:bg-white rounded-xl p-3.5 border border-slate-200/80 hover:border-brand-300 hover:shadow-sm transition-all duration-200"
              >
                <span className="text-2xl block mb-2">{p.icon}</span>
                <p className="font-bold text-slate-900 text-xs mb-0.5">{p.name}</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
