import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { incidentsApi, type Department } from '../lib/api'

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function ReportIncidentPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    description: '',
    department_id: '',
    priority: 'MEDIUM',
    location: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])

  useEffect(() => {
    incidentsApi.getDepartments()
      .then(response => setDepartments(response.data))
      .catch(err => setError(err.response?.data?.detail ?? 'Failed to load reporting departments.'))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const department = departments.find(d => String(d.id) === form.department_id)
    if (!department) {
      setError('Please select an available department.')
      return
    }
    setLoading(true)
    try {
      const res = await incidentsApi.create({
        ...form,
        category: department.name,
        department_id: department.id,
      })
      navigate(`/incidents/${res.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to submit incident. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-slide-up">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 mb-3 transition-colors"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">Report an Incident</h1>
          <p className="text-slate-500 text-xs mt-1">
            Submit a campus issue or emergency. Our automated dispatch system will route it to the appropriate responder immediately.
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="title">Incident Title</label>
              <input
                id="title"
                name="title"
                className="input"
                placeholder="e.g. Water Leakage - Hostel A, 3rd Floor"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="category">Category</label>
                <select
                  id="category"
                  name="department_id"
                  className="input cursor-pointer"
                  value={form.department_id}
                  onChange={handleChange}
                  disabled={departments.length === 0}
                >
                  <option value="">
                    {departments.length ? '-- Select Department --' : 'No departments available'}
                  </option>
                  {departments.map(department => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="priority">Initial Priority</label>
                <select
                  id="priority"
                  name="priority"
                  className="input cursor-pointer"
                  value={form.priority}
                  onChange={handleChange}
                >
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="location">Specific Location</label>
              <input
                id="location"
                name="location"
                className="input"
                placeholder="e.g. Hostel A - 3rd Floor, Room 302"
                value={form.location}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="description">Detailed Description</label>
              <textarea
                id="description"
                name="description"
                className="input min-h-[130px] resize-none leading-relaxed"
                placeholder="Provide comprehensive details of what happened, current severity, and any immediate hazards…"
                value={form.description}
                onChange={handleChange}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                id="submit-incident-btn"
                type="submit"
                className="btn-primary flex-1 py-3"
                disabled={loading}
              >
                {loading ? 'Submitting Report…' : '📢 Submit Incident Report'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
