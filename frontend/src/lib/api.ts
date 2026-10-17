import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  name: string
  email: string
  role: string
  department_id: number | null
}

export interface Incident {
  id: number
  title: string
  description: string
  category: string
  priority: string
  status: string
  location: string
  reporter_id: number
  department_id: number | null
  assigned_to_id: number | null
  created_at: string
  updated_at: string
}

export interface IncidentHistory {
  id: number
  incident_id: number
  changed_by_id: number
  old_status: string
  new_status: string
  note: string | null
  changed_at: string
}

export interface Notification {
  id: number
  user_id: number
  incident_id: number
  message: string
  is_read: boolean
  created_at: string
}

export interface Department {
  id: number
  name: string
  description: string | null
  is_reportable: boolean
}

export interface Analytics {
  total_incidents: number
  open_incidents: number
  resolved_incidents: number
  closed_incidents: number
  critical_incidents: number
  escalated_incidents: number
  by_category: Record<string, number>
  by_status: Record<string, number>
  by_priority: Record<string, number>
}

// ── API calls ────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', new URLSearchParams({ username: email, password })),
  me: () => api.get<User>('/auth/me'),
}

export const incidentsApi = {
  getAll: () => api.get<Incident[]>('/incidents/'),
  getById: (id: number) => api.get<Incident>(`/incidents/${id}`),
  create: (data: object) => api.post<Incident>('/incidents/', data),
  updateStatus: (id: number, status: string, note?: string) =>
    api.patch<Incident>(`/incidents/${id}/status`, { status, note }),
  assign: (id: number, technician_id?: number, strategy = 'least_busy') =>
    api.post<Incident>(`/incidents/${id}/assign`, { technician_id: technician_id || undefined, strategy }),
  escalate: (id: number) => api.post(`/incidents/${id}/escalate`),
  getHistory: (id: number) => api.get<IncidentHistory[]>(`/incidents/${id}/history`),
  getAnalytics: () => api.get<Analytics>('/incidents/analytics'),
  getTechnicians: (departmentId?: number) =>
    api.get<User[]>('/incidents/technicians', {
      params: departmentId ? { department_id: departmentId } : undefined,
    }),
  getDepartments: () => api.get<Department[]>('/incidents/departments'),
}

export const notificationsApi = {
  getAll: () => api.get<Notification[]>('/notifications/'),
  getUnreadCount: () => api.get<{ unread_count: number }>('/notifications/unread-count'),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
}

export const adminApi = {
  getUsers: () => api.get<User[]>('/admin/users'),
  createUser: (data: {
    name: string
    email: string
    password: string
    role: string
    department_id?: number | null
  }) => api.post<User>('/admin/users', data),
  updateUserDepartment: (id: number, department_id: number | null) =>
    api.patch<User>(`/admin/users/${id}/department`, { department_id }),
  getDepartments: () => api.get<Department[]>('/admin/departments'),
  createDepartment: (data: object) => api.post<Department>('/admin/departments', data),
}
