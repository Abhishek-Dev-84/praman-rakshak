import { STATUS_COLORS } from '../../utils/constants'
import { CheckCircle2, Clock, XCircle, AlertTriangle, Circle } from 'lucide-react'

const ICONS = {
  Verified: CheckCircle2,
  Pending: Clock,
  'Pending Review': Clock,
  'Not Verified': Clock,
  UNVERIFIED: Clock,
  Rejected: XCircle,
  Blocked: XCircle,
  High: AlertTriangle,
}

export default function Badge({ status, children, withIcon = true, className = '' }) {
  const label = children || status
  const colors = STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'
  const Icon = ICONS[status]

  return (
    <span className={`badge ${colors} ${className}`}>
      {withIcon && Icon ? <Icon size={12} strokeWidth={2.5} /> : withIcon ? <Circle size={8} fill="currentColor" /> : null}
      {label}
    </span>
  )
}
