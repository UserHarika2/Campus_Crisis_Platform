import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { StatusBadge, PriorityBadge, formatCategory, formatDate } from '../components/Badges'
import { incidentsApi, type Department, type Incident, type IncidentHistory, type User } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const NEXT_STATUSES: Record<string, Record<string, string[]>> = {
  STUDENT:    { RESOLVED: ['CLOSED', 'REOPENED'] },
  OFFICER:    { REPORTED: ['ASSIGNED', 'ESCALATED'], ASSIGNED: ['IN_PROGRESS', 'ESCALATED'], IN_PROGRESS: ['RESOLVED', 'ESCALATED'], RESOLVED: ['CLOSED', 'REOPENED'], ESCALATED: ['ASSIGNED'], REOPENED: ['ASSIGNED', 'ESCALATED'] },
  TECHNICIAN: { REPORTED: ['ASSIGNED'], ASSIGNED: ['IN_PROGRESS', 'RESOLVED'], IN_PROGRESS: ['RESOLVED'], ESCALATED: ['ASSIGNED'], REOPENED: ['IN_PROGRESS', 'RESOLVED'] },
  ADMIN:      { REPORTED: ['ASSIGNED', 'ESCALATED'], ASSIGNED: ['IN_PROGRESS', 'RESOLVED', 'ESCALATED'], IN_PROGRESS: ['RESOLVED', 'ESCALATED'], RESOLVED: ['CLOSED', 'REOPENED'], ESCALATED: ['ASSIGNED'], REOPENED: ['ASSIGNED', 'IN_PROGRESS'] },
  SECURITY:   { REPORTED: ['ESCALATED'], ASSIGNED: ['ESCALATED'], IN_PROGRESS: ['ESCALATED'] },
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [history, setHistory] = useState<IncidentHistory[]>([])
  const [technicians, setTechnicians] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [resolutionSummary, setResolutionSummary] = useState('')
  const [updating, setUpdating] = useState(false)
  const [escalating, setEscalating] = useState(false)
  const [assigningId, setAssigningId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    if (!id) return
    const [inc, hist] = await Promise.all([
      incidentsApi.getById(Number(id)),
      incidentsApi.getHistory(Number(id)),
    ])
    setIncident(inc.data)
    setHistory(hist.data)
    try {
      const [availableTechnicians, availableDepartments] = await Promise.all([
        incidentsApi.getTechnicians(inc.data.department_id ?? undefined),
        incidentsApi.getDepartments(),
      ])
      setTechnicians(availableTechnicians.data)
      setDepartments(availableDepartments.data)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to load technicians for this department')
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [id])

  const doStatusChange = async (status: string, customNote?: string) => {
    if (!incident) return
    setUpdating(true)
    setError('')
    setSuccess('')
    try {
      const finalNote = customNote || note || undefined
      await incidentsApi.updateStatus(incident.id, status, finalNote)
      setSuccess(`Status successfully transitioned to ${status.replace('_', ' ')}!`)
      setNote('')
      setResolutionSummary('')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const doEscalate = async () => {
    if (!incident) return
    setEscalating(true)
    setError('')
    try {
      const res = await incidentsApi.escalate(incident.id)
      setSuccess(`Escalated: handled by ${res.data.handled_by} → ${res.data.action}`)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to escalate')
    } finally {
      setEscalating(false)
    }
  }

  const doAssign = async (autoStrategy = false, targetId?: number) => {
    if (!incident) return
    setUpdating(true)
    setError('')
    setSuccess('')
    try {
      if (autoStrategy) {
        await incidentsApi.assign(incident.id, undefined, 'least_busy')
        setSuccess('Technician assigned using least-busy workload balancing.')
      } else {
        const idToAssign = targetId || Number(assigningId)
        if (!idToAssign) {
          setError('Please select a technician to assign.')
          setUpdating(false)
          return
        }
        await incidentsApi.assign(incident.id, idToAssign)
        setSuccess(`Assigned technician User #${idToAssign}`)
      }
      setAssigningId('')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to assign technician')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <Layout><div className="text-center py-20 text-slate-400">Loading incident details…</div></Layout>
  if (!incident) return <Layout><div className="text-center py-20 text-slate-400">Incident not found.</div></Layout>

  const allowedTransitions = NEXT_STATUSES[user?.role ?? '']?.[incident.status] ?? []
  const isReporter = user?.id === incident.reporter_id
  const isTechnician = user?.role === 'TECHNICIAN'
  const isOfficer = user?.role === 'OFFICER'
  const isAdmin = user?.role === 'ADMIN'
  const isAssignedToCurrentTech = incident.assigned_to_id === user?.id

  // Visual Lifecycle Progress step
  const steps = [
    { key: 'REPORTED', label: '1. Reported' },
    { key: 'ASSIGNED', label: '2. Assigned' },
    { key: 'IN_PROGRESS', label: '3. In Progress' },
    { key: 'RESOLVED', label: '4. Resolved' },
    { key: 'CLOSED', label: '5. Closed' },
  ]
  const currentStepIndex = steps.findIndex(s => s.key === incident.status)

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl animate-slide-up">
        {/* Back */}
        <button 
          onClick={() => navigate(-1)} 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
        >
          <span>←</span>
          <span>Back to previous page</span>
        </button>

        {/* Header / Summary Card */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Incident #{incident.id}
                </span>
                <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-200/60">
                  {formatCategory(incident.category)}
                </span>
                {isReporter && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Your Report
                  </span>
                )}
                {isAssignedToCurrentTech && (
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    🔧 Assigned to You
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{incident.title}</h1>
            </div>
            <div className="flex gap-2 shrink-0">
              <PriorityBadge priority={incident.priority} />
              <StatusBadge status={incident.status} />
            </div>
          </div>

          {/* Lifecycle Step Progress Bar */}
          <div className="mb-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Incident Lifecycle Progress
            </p>
            <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
              {steps.map((st, idx) => {
                const isPassed = currentStepIndex !== -1 && idx <= currentStepIndex
                const isCurrent = st.key === incident.status
                return (
                  <div 
                    key={st.key}
                    className={`py-1.5 px-1 rounded-lg border text-[11px] font-semibold transition-all ${
                      isCurrent
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : isPassed
                        ? 'bg-brand-50 text-brand-800 border-brand-200'
                        : 'bg-white text-slate-400 border-slate-200/70'
                    }`}
                  >
                    {st.label}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100 text-xs">
            <div>
              <p className="text-slate-400 font-medium mb-1">📁 Category</p>
              <p className="text-slate-900 font-bold">{formatCategory(incident.category)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">📍 Location</p>
              <p className="text-slate-900 font-bold">{incident.location}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">🕒 Reported</p>
              <p className="text-slate-900 font-bold">{formatDate(incident.created_at)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">👷 Assigned To</p>
              <p className="text-slate-900 font-bold">
                {incident.assigned_to_id ? (
                  <span className="text-brand-600 font-semibold">User #{incident.assigned_to_id}</span>
                ) : (
                  <span className="text-amber-600 font-medium">⚠️ Unassigned</span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Detailed Description</p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed">
              {incident.description}
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
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

        {/* ── TECHNICIAN RESOLUTION HUB ──────────────────────────────────────── */}
        {(isTechnician || isAdmin) && incident.status !== 'CLOSED' && (
          <div className="card border-2 border-brand-200/80 bg-gradient-to-br from-white to-brand-50/20 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-200/80">🔧</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Technician Resolution Hub</h2>
                  <p className="text-xs text-slate-500">Perform repairs, update on-site status, and confirmly resolve the issue</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                Technician Console
              </span>
            </div>

            {/* If unassigned or reported, technician can claim it */}
            {!incident.assigned_to_id && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                <div className="text-xs text-amber-800">
                  <strong>Unassigned Task:</strong> This incident is waiting for a responder.
                </div>
                <button
                  onClick={() => doAssign(false, user?.id)}
                  disabled={updating}
                  className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
                >
                  ✋ Claim & Take Ownership
                </button>
              </div>
            )}

            {/* Quick Action Buttons for Technician */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {incident.status === 'ESCALATED' && (
                <button
                  onClick={() => doStatusChange('ASSIGNED', 'Technician resumed the escalated incident.')}
                  disabled={updating}
                  className="btn-secondary text-xs py-3 border-indigo-200 hover:border-indigo-400 hover:text-indigo-600 font-bold"
                >
                  🔄 Return to Assigned Work
                </button>
              )}

              {incident.status === 'ASSIGNED' && (
                <button
                  onClick={() => doStatusChange('IN_PROGRESS', 'Technician arrived on-site and started repair work.')}
                  disabled={updating}
                  className="btn-secondary text-xs py-3 border-indigo-200 hover:border-indigo-400 hover:text-indigo-600 font-bold"
                >
                  🚀 1. Start Work (In Progress)
                </button>
              )}

              {incident.status === 'IN_PROGRESS' && (
                <div className="col-span-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                  <span><strong>Work in progress:</strong> You are actively addressing this crisis. Submit your resolution details below when complete.</span>
                </div>
              )}
            </div>

            {/* CONFIRMED RESOLUTION FORM */}
            {(incident.status === 'IN_PROGRESS' || incident.status === 'ASSIGNED' || incident.status === 'REOPENED') && (
              <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                <label className="label text-slate-800 font-bold text-xs" htmlFor="technician-resolution-note">
                  ✓ Resolution Confirmation & Work Summary
                </label>
                <textarea
                  id="technician-resolution-note"
                  className="input min-h-[90px] text-xs leading-relaxed"
                  placeholder="Detail the exact action taken (e.g. Replaced faulty circuit breaker, inspected wiring, tested power - fully functional)..."
                  value={resolutionSummary}
                  onChange={e => setResolutionSummary(e.target.value)}
                />
                <button
                  id="confirm-resolve-btn"
                  onClick={() => doStatusChange('RESOLVED', resolutionSummary || 'Issue fixed and verified by technician.')}
                  disabled={updating}
                  className="btn-primary w-full py-3 text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20"
                >
                  {updating ? 'Recording Resolution…' : '✓ Confirm & Mark Issue as Resolved'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CRISIS OFFICER DISPATCH HUB ────────────────────────────────────── */}
        {(isOfficer || isAdmin) && incident.status !== 'CLOSED' && (
          <div className="card space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Crisis Officer Dispatch Hub</h2>
                <p className="text-xs text-slate-500 mt-0.5">Assign a technician or escalate the incident for additional support.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Officer Dispatch
              </span>
            </div>

            {/* Dropdown Technician Assignment (Manual or Strategy) */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>♟️</span>
                <span>Assign Technician</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  id="assign-technician-id"
                  className="input flex-1 text-xs cursor-pointer"
                  value={assigningId}
                  onChange={e => setAssigningId(e.target.value)}
                >
                  <option value="">-- Select Available Technician --</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>
                      #{t.id} - {t.name} ({t.email}) — {
                        departments.find(department => department.id === t.department_id)?.name
                        ?? 'General / Any Department'
                      }
                    </option>
                  ))}
                </select>

                <button
                  id="assign-btn"
                  onClick={() => doAssign(false)}
                  disabled={!assigningId || updating}
                  className="btn-primary shrink-0 text-xs py-2 px-4"
                >
                  Assign to Tech
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-xs text-slate-500">Or use automated workload balancing:</span>
                <button
                  id="auto-assign-btn"
                  onClick={() => doAssign(true)}
                  disabled={updating}
                  className="btn-secondary text-xs py-1.5 px-3 hover:border-brand-400 hover:text-brand-600 font-semibold"
                >
                  ⚡ Auto-Assign (Least Busy)
                </button>
              </div>
            </div>

            {/* Escalation button */}
            {!['ESCALATED'].includes(incident.status) && (
              <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200/70 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-0.5">
                    ⛓️ Escalation
                  </p>
                  <p className="text-xs text-rose-600">
                    Pass incident up to Senior Supervisor and Administration
                  </p>
                </div>
                <button
                  id="escalate-btn"
                  onClick={doEscalate}
                  disabled={escalating}
                  className="btn-danger text-xs py-2 px-4 shrink-0 font-semibold"
                >
                  {escalating ? 'Escalating…' : '⚠️ Escalate Issue'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STUDENT VERIFICATION HUB ───────────────────────────────────────── */}
        {isReporter && (
          <div className="card space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Reporter Status & Verification</h2>
              <p className="text-xs text-slate-500">Track and confirm the resolution of your submitted report</p>
            </div>

            {incident.status === 'RESOLVED' ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold">
                  <span>🎉</span>
                  <span>The response team has marked this crisis as RESOLVED!</span>
                </div>
                <p className="text-xs text-emerald-700">
                  Please verify that the issue has been properly fixed on campus. Confirm and close this ticket if resolved, or reopen it if further assistance is required.
                </p>
                <div className="flex gap-3 pt-1">
                  <button
                    id="confirm-close-btn"
                    onClick={() => doStatusChange('CLOSED', 'Student confirmed fix and closed the ticket.')}
                    disabled={updating}
                    className="btn-primary flex-1 text-xs py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600"
                  >
                    ✓ Confirm & Close Ticket
                  </button>
                  <button
                    id="reopen-issue-btn"
                    onClick={() => doStatusChange('REOPENED', 'Student reported issue is still not fixed.')}
                    disabled={updating}
                    className="btn-secondary text-xs py-2.5 hover:border-amber-400 hover:text-amber-700"
                  >
                    🔄 Issue Not Fixed — Reopen Ticket
                  </button>
                </div>
              </div>
            ) : incident.status === 'CLOSED' ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                ✓ <strong>This incident is successfully resolved and closed.</strong> Thank you for helping keep campus safe!
              </div>
            ) : (
              <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900">
                ℹ️ <strong>Status: {incident.status.replace('_', ' ')}</strong>. Our response personnel are handling your report. You will be notified when repairs are complete.
              </div>
            )}
          </div>
        )}

        {/* ── GENERIC STATE TRANSITIONS (IF ALLOWED) ─────────────────────────── */}
        {allowedTransitions.length > 0 && !isTechnician && !isReporter && (
          <div className="card space-y-3">
            <h2 className="text-base font-bold text-slate-900">Lifecycle Transitions (State Pattern)</h2>
            <div className="flex gap-2 flex-wrap">
              {allowedTransitions.map(s => (
                <button
                  key={s}
                  id={`status-${s}`}
                  onClick={() => doStatusChange(s)}
                  disabled={updating}
                  className="btn-secondary text-xs px-3.5 py-2 font-semibold hover:border-brand-400 hover:text-brand-600"
                >
                  → {s.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div>
              <label className="label" htmlFor="status-note">Transition Note (optional)</label>
              <input
                className="input text-xs"
                placeholder="Add comment regarding this change…"
                value={note}
                onChange={e => setNote(e.target.value)}
                id="status-note"
              />
            </div>
          </div>
        )}

        {/* ── AUDIT HISTORY TIMELINE ────────────────────────────────────────── */}
        <div className="card">
          <div className="border-b border-slate-100 pb-3 mb-5">
            <h2 className="text-base font-bold text-slate-900">Incident Timeline (Audit Trail)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Immutable record of state transitions, technicians assigned, and resolution notes</p>
          </div>

          {history.length === 0 ? (
            <p className="text-slate-400 text-xs py-4 text-center">No lifecycle changes recorded yet.</p>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200" />
              <div className="space-y-4">
                {history.map((h) => (
                  <div key={h.id} className="relative flex gap-3 text-xs">
                    <div className="absolute -left-6 w-3 h-3 bg-white border-2 border-brand-600 rounded-full mt-1 -translate-x-1/2 shadow-sm" />
                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-slate-800">
                          Status Transition
                        </span>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                          <span>User #{h.changed_by_id}</span>
                          <span>•</span>
                          <span>{formatDate(h.changed_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded font-semibold text-[11px]">
                          {h.old_status}
                        </span>
                        <span className="text-slate-400 font-bold">→</span>
                        <span className="px-2 py-0.5 bg-brand-100 text-brand-800 rounded font-semibold text-[11px]">
                          {h.new_status}
                        </span>
                      </div>
                      {h.note && (
                        <p className="mt-2 text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200 text-xs leading-relaxed">
                          "{h.note}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
