import { Search, Filter, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function SearchInput({ value, onChange, placeholder = 'Search…', onFilterClick, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="input pl-9"
        />
      </div>
      {onFilterClick && (
        <button onClick={onFilterClick} className="btn-outline shrink-0 px-3">
          <Filter size={16} />
        </button>
      )}
    </div>
  )
}

export function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-1 overflow-x-auto ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
            active === tab.value
              ? 'bg-navy-700 text-white'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 ${active === tab.value ? 'opacity-80' : 'text-slate-400'}`}>
              ({tab.count})
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ title, subtitle, back, actions }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="mt-0.5 rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50 shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-navy-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function FilterPills({ options, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
            active === opt.value
              ? 'bg-navy-700 text-white border-navy-700'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
