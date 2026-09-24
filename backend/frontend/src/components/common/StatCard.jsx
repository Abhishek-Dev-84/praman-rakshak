export default function StatCard({ icon: Icon, label, value, trend, trendUp, accent = 'text-navy-700 bg-navy-50' }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      {Icon && (
        <div className={`shrink-0 rounded-lg p-2.5 ${accent}`}>
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-bold text-navy-900 leading-tight">{value}</p>
        <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
        {trend && (
          <p className={`text-xs mt-1 font-semibold ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend}
          </p>
        )}
      </div>
    </div>
  )
}
