import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { adminApi, type Department, type User } from '../lib/api'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'STUDENT', department_id: '',
  })
  const [adding, setAdding] = useState(false)
  const [savingDepartmentId, setSavingDepartmentId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => adminApi.getUsers().then(r => setUsers(r.data)).finally(() => setLoading(false))
  useEffect(() => {
    load()
    adminApi.getDepartments()
      .then(response => setDepartments(response.data))
      .catch(err => setError(err.response?.data?.detail ?? 'Failed to load departments'))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError('')
    setSuccess('')
    try {
      await adminApi.createUser({
        ...form,
        department_id: form.department_id ? Number(form.department_id) : null,
      })
      setSuccess('User created successfully')
      setForm({ name: '', email: '', password: '', role: 'STUDENT', department_id: '' })
      await load()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to create user')
    } finally {
      setAdding(false)
    }
  }

  const updateTechnicianDepartment = async (user: User, departmentId: string) => {
    setError('')
    setSuccess('')
    setSavingDepartmentId(user.id)
    try {
      const response = await adminApi.updateUserDepartment(
        user.id,
        departmentId ? Number(departmentId) : null,
      )
      setUsers(current => current.map(item => item.id === user.id ? response.data : item))
      setSuccess(`Department updated for ${user.name}`)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to update technician department')
    } finally {
      setSavingDepartmentId(null)
    }
  }

  const roles = ['STUDENT', 'OFFICER', 'TECHNICIAN', 'ADMIN', 'SECURITY']
  const roleBadgeStyles: Record<string, string> = {
    ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
    OFFICER: 'bg-orange-50 text-orange-700 border-orange-200',
    TECHNICIAN: 'bg-amber-50 text-amber-700 border-amber-200',
    STUDENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    SECURITY: 'bg-purple-50 text-purple-700 border-purple-200',
  }

  return (
    <Layout>
      <div className="space-y-8 animate-slide-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">User Administration</h1>
          <p className="text-slate-500 text-xs mt-1">Manage campus role access control and system accounts</p>
        </div>

        {/* Create user */}
        <div className="card">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900">Provision New User Account</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter account credentials and specify role authorization level</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="new-user-name">Full Name</label>
                <input
                  className="input" required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Maya Patel"
                  id="new-user-name"
                />
              </div>
              <div>
                <label className="label" htmlFor="new-user-email">Email Address</label>
                <input
                  className="input" type="email" required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="name@campus.edu"
                  id="new-user-email"
                />
              </div>
              <div>
                <label className="label" htmlFor="new-user-password">Initial Password</label>
                <input
                  className="input" type="password" required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  id="new-user-password"
                />
              </div>
              <div>
                <label className="label" htmlFor="new-user-role">Assigned Role</label>
                <select
                  className="input cursor-pointer"
                  value={form.role}
                  onChange={e => setForm(f => ({
                    ...f,
                    role: e.target.value,
                    department_id: e.target.value === 'TECHNICIAN' ? f.department_id : '',
                  }))}
                  id="new-user-role"
                >
                  {roles.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              {form.role === 'TECHNICIAN' && (
                <div>
                  <label className="label" htmlFor="new-user-department">Assigned Department</label>
                  <select
                    className="input cursor-pointer"
                    value={form.department_id}
                    onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                    id="new-user-department"
                  >
                    <option value="">General / Any Department</option>
                    {departments.map(department => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <span>✓</span>
                <span>{success}</span>
              </div>
            )}

            <button id="create-user-btn" type="submit" className="btn-primary py-2.5 px-5" disabled={adding}>
              {adding ? 'Provisioning…' : '+ Create User'}
            </button>
          </form>
        </div>

        {/* Users list */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Registered Accounts</h2>
              <p className="text-xs text-slate-500 mt-0.5">Active directory users and permissions</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {users.length} Users
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading user directory…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-slate-50/80 rounded-xl">
                    <th className="py-3 px-3 text-slate-500 font-semibold text-xs uppercase tracking-wider rounded-l-xl">ID</th>
                    <th className="py-3 px-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Name</th>
                    <th className="py-3 px-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Email</th>
                    <th className="py-3 px-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Department</th>
                    <th className="py-3 px-3 text-slate-500 font-semibold text-xs uppercase tracking-wider rounded-r-xl">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3 text-slate-400 font-mono text-xs">#{u.id}</td>
                      <td className="py-3.5 px-3 text-slate-900 font-semibold flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <span>{u.name}</span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium">{u.email}</td>
                      <td className="py-3.5 px-3 text-slate-600">
                        {u.role === 'TECHNICIAN' ? (
                          <select
                            className="input min-w-44 py-1.5 text-xs"
                            value={u.department_id ?? ''}
                            disabled={savingDepartmentId === u.id}
                            onChange={event => updateTechnicianDepartment(u, event.target.value)}
                            aria-label={`Department for ${u.name}`}
                          >
                            <option value="">General / Any Department</option>
                            {departments.map(department => (
                              <option key={department.id} value={department.id}>{department.name}</option>
                            ))}
                          </select>
                        ) : '—'}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadgeStyles[u.role] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
