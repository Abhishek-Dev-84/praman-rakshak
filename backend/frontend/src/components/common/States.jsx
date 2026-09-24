import { Loader2, Inbox, ShieldAlert, AlertTriangle } from 'lucide-react'

export function Spinner({ label = 'Loading…', size = 20, full = false }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 text-slate-500 ${
        full ? 'py-24' : 'py-8'
      }`}
    >
      <Loader2 className="animate-spin" size={size} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="rounded-full bg-slate-100 p-4 mb-3">
        <Icon size={28} className="text-slate-400" />
      </div>
      <p className="font-semibold text-navy-800">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="rounded-full bg-red-50 p-4 mb-3">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      <p className="font-semibold text-navy-800">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn-outline btn-sm mt-4">
          Try again
        </button>
      )}
    </div>
  )
}

export function Unauthorized() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div className="rounded-full bg-red-50 p-4 mb-3">
        <ShieldAlert size={32} className="text-red-500" />
      </div>
      <p className="font-bold text-lg text-navy-900">Access Restricted</p>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        You do not have permission to view this page with your current role. Contact your
        administrator if you believe this is an error.
      </p>
    </div>
  )
}
