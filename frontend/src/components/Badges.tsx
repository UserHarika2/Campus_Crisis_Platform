export function PriorityBadge({ priority }: { priority: string }) {
  const dotColor: Record<string, string> = {
    CRITICAL: 'bg-red-500 animate-pulse',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-amber-500',
    LOW: 'bg-emerald-500',
  }
  const cls: Record<string, string> = {
    CRITICAL: 'badge-critical',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
  }
  return (
    <span className={cls[priority] ?? 'badge-low'}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor[priority] ?? 'bg-slate-400'}`} />
      <span>{priority}</span>
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const dotColor: Record<string, string> = {
    REPORTED: 'bg-sky-500',
    ASSIGNED: 'bg-indigo-500',
    IN_PROGRESS: 'bg-purple-500',
    RESOLVED: 'bg-emerald-500',
    CLOSED: 'bg-slate-400',
    ESCALATED: 'bg-rose-500 animate-pulse',
    REOPENED: 'bg-amber-500',
  }
  const cls: Record<string, string> = {
    REPORTED: 'status-reported',
    ASSIGNED: 'status-assigned',
    IN_PROGRESS: 'status-inprogress',
    RESOLVED: 'status-resolved',
    CLOSED: 'status-closed',
    ESCALATED: 'status-escalated',
    REOPENED: 'status-reopened',
  }
  return (
    <span className={cls[status] ?? 'status-reported'}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor[status] ?? 'bg-slate-400'}`} />
      <span>{status.replace('_', ' ')}</span>
    </span>
  )
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatCategory(category: string) {
  return category === 'IT' ? 'Tech' : category
}
