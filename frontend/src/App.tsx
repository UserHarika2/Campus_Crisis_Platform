import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ReportIncidentPage from './pages/ReportIncidentPage'
import IncidentsListPage from './pages/IncidentsListPage'
import IncidentDetailPage from './pages/IncidentDetailPage'
import NotificationsPage from './pages/NotificationsPage'
import UsersPage from './pages/UsersPage'
import DepartmentsPage from './pages/DepartmentsPage'
import AnalyticsPage from './pages/AnalyticsPage'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <div className="text-slate-500 font-medium text-sm">Loading campus platform…</div>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />

      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />

      <Route path="/report" element={
        <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
          <ReportIncidentPage />
        </ProtectedRoute>
      } />

      {/* Both /incidents and /my-incidents go to same list — backend filters by role */}
      <Route path="/incidents" element={
        <ProtectedRoute><IncidentsListPage /></ProtectedRoute>
      } />
      <Route path="/my-incidents" element={
        <ProtectedRoute><IncidentsListPage /></ProtectedRoute>
      } />
      <Route path="/my-tasks" element={
        <ProtectedRoute><IncidentsListPage /></ProtectedRoute>
      } />

      <Route path="/incidents/:id" element={
        <ProtectedRoute><IncidentDetailPage /></ProtectedRoute>
      } />

      <Route path="/notifications" element={
        <ProtectedRoute><NotificationsPage /></ProtectedRoute>
      } />

      <Route path="/users" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <UsersPage />
        </ProtectedRoute>
      } />

      <Route path="/departments" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'OFFICER']}>
          <DepartmentsPage />
        </ProtectedRoute>
      } />

      <Route path="/analytics" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'OFFICER']}>
          <AnalyticsPage />
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
