import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { adminApi, type Department } from '../lib/api'

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', description: '' })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => adminApi.getDepartments().then(r => setDepartments(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError('')
    setSuccess('')
    try {
      await adminApi.createDepartment(form)
      setSuccess(`Department "${form.name}" created`)
      setForm({ name: '', description: '' })
      await load()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to create department')
    } finally {
      setAdding(false)
    }
  }

  const getDeptIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('medical') || lower.includes('health')) return '🏥'
    if (lower.includes('security') || lower.includes('police')) return '🔒'
    if (lower.includes('hostel') || lower.includes('housing')) return '🏠'
    if (lower.includes('it') || lower.includes('tech')) return '💻'
    if (lower.includes('facilit') || lower.includes('infra')) return '🏗️'
    if (lower.includes('transport') || lower.includes('bus')) return '🚌'
    return '🏢'
  }

  return (
    <Layout>
      <div className="space-y-8 animate-slide-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">Campus Departments</h1>
          <p className="text-slate-500 text-xs mt-1">Configure emergency response and crisis operational units</p>
        </div>

        {/* Add department */}
        <div className="card">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900">Add New Department</h2>
            <p className="text-xs text-slate-500 mt-0.5">Register a crisis unit to receive dispatched incident reports</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="dept-name">Department Name</label>
                <input
                  className="input" required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Hostel Maintenance"
                  id="dept-name"
                />
              </div>
              <div>
                <label className="label" htmlFor="dept-desc">Department Description</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Scope of operations and primary contacts"
                  id="dept-desc"
                />
              </div>
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

            <button id="create-dept-btn" type="submit" className="btn-primary" disabled={adding}>
              {adding ? 'Creating Unit…' : '+ Add Department'}
            </button>
          </form>
        </div>

        {/* Departments Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Operational Units ({departments.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-3 text-center py-12 text-slate-400">Loading departments…</div>
            ) : departments.length === 0 ? (
              <div className="card text-slate-500 col-span-3 text-center py-12">
                <span className="text-4xl block mb-2">🏢</span>
                <p className="font-semibold text-slate-800">No departments configured yet.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Use the form above to add departments that support hostel, tech, and campus infrastructure operations.
                </p>
              </div>
            ) : (
              departments.map(d => (
                <div 
                  key={d.id} 
                  className="card hover:border-brand-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        {getDeptIcon(d.name)}
                      </span>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        ID #{d.id}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mb-1.5">{d.name}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {d.description ?? 'No specific operational description provided.'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
