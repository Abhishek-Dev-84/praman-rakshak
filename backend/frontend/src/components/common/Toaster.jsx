import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useUI } from '../../context/UIContext'

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }
const COLORS = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-navy-700',
}

export default function Toaster() {
  const { toasts, dismissToast } = useUI()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info
        return (
          <div
            key={t.id}
            className={`${COLORS[t.type] || COLORS.info} text-white rounded-lg shadow-lg px-4 py-3 flex items-start gap-2.5 animate-fade-in`}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              {t.title && <p className="text-sm font-semibold leading-tight">{t.title}</p>}
              {t.message && <p className="text-xs opacity-90 mt-0.5">{t.message}</p>}
            </div>
            <button onClick={() => dismissToast(t.id)} className="shrink-0 opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
