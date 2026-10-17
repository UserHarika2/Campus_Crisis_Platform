import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { notificationsApi } from '../lib/api'

const navByRole: Record<string, { to: string; label: string; icon: string }[]> = {
  STUDENT: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/report', label: 'Report Incident', icon: '📢' },
    { to: '/my-incidents', label: 'My Incidents', icon: '📋' },
    { to: '/notifications', label: 'Notifications', icon: '🔔' },
  ],
  OFFICER: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/incidents', label: 'Incident Queue', icon: '📋' },
    { to: '/notifications', label: 'Notifications', icon: '🔔' },
  ],
  TECHNICIAN: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/my-tasks', label: 'My Tasks', icon: '🔧' },
    { to: '/notifications', label: 'Notifications', icon: '🔔' },
  ],
  ADMIN: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/incidents', label: 'All Incidents', icon: '📋' },
    { to: '/users', label: 'Users', icon: '👥' },
    { to: '/departments', label: 'Departments', icon: '🏢' },
    { to: '/analytics', label: 'Analytics', icon: '📊' },
    { to: '/notifications', label: 'Notifications', icon: '🔔' },
  ],
  SECURITY: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/incidents', label: 'Incidents', icon: '🚨' },
    { to: '/notifications', label: 'Notifications', icon: '🔔' },
  ],
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    notificationsApi.getUnreadCount()
      .then(r => setUnread(r.data.unread_count))
      .catch(() => {})
    const interval = setInterval(() => {
      notificationsApi.getUnreadCount()
        .then(r => setUnread(r.data.unread_count))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const nav = navByRole[user?.role ?? 'STUDENT'] ?? []

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col shadow-sm shrink-0 z-20">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-md shadow-brand-500/25">
              🚨
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight tracking-tight">Campus Crisis</p>
              <p className="text-xs font-medium text-slate-400">Platform Portal</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-medium text-slate-500">Live Coordination Active</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ` +
                (isActive
                  ? 'bg-brand-50 text-brand-700 font-semibold shadow-sm border border-brand-200/80'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.label === 'Notifications' && unread > 0 && (
                <span className="ml-auto bg-brand-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Card in Sidebar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                {user?.role}
              </span>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="btn-secondary w-full text-xs py-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50/40">
        {/* Subtle Top Utility Bar */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/70 px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Role:</span>
            <span className="bg-brand-50 text-brand-700 border border-brand-200/80 px-2 py-0.5 rounded-full font-semibold">
              {user?.role ?? 'STUDENT'}
            </span>
            <span className="text-slate-300">|</span>
            <span>Signed in as <strong className="text-slate-700">{user?.email}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <NavLink 
              to="/notifications" 
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <span>🔔</span>
              {unread > 0 ? (
                <span className="font-semibold text-brand-600">{unread} new alert{unread > 1 ? 's' : ''}</span>
              ) : (
                <span>No alerts</span>
              )}
            </NavLink>
          </div>
        </header>

        <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
