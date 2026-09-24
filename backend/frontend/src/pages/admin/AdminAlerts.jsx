import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, AlertCircle, Info, Loader2, ShieldAlert } from 'lucide-react'
import { PageHeader, FilterPills } from '../../components/common/Controls'
import { EmptyState } from '../../components/common/States'
import { fetchAnomalies } from '../../api/realApi'

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [severity, setSeverity] = useState('All')

  useEffect(() => {
    async function loadAlerts() {
      setLoading(true)
      try {
        const data = await fetchAnomalies()
        setAlerts(Array.isArray(data) ? data : data?.results || [])
      } catch (err) {
        console.error('Failed to load security alerts:', err)
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }
    loadAlerts()
  }, [])

  const filtered = useMemo(() => {
    let list = alerts
    if (severity === 'High') {
      list = list.filter((a) => a.flagged || (a.anomaly_score && a.anomaly_score > 0.7))
    } else if (severity === 'Medium') {
      list = list.filter((a) => a.anomaly_score && a.anomaly_score <= 0.7 && a.anomaly_score > 0.3)
    } else if (severity === 'Low') {
      list = list.filter((a) => !a.flagged && (!a.anomaly_score || a.anomaly_score <= 0.3))
    }
    return list
  }, [alerts, severity])

  return (
    <div>
      <PageHeader
        title="Security & Anomaly Alerts"
        subtitle={loading ? "Loading security telemetry…" : `${alerts.length} total events · ${alerts.filter(a => a.flagged).length} flagged high-priority anomalies`}
      />
      
      <div className="card p-4 mb-4">
        <FilterPills
          options={['All', 'High', 'Medium', 'Low'].map((s) => ({ value: s, label: s }))}
          active={severity}
          onChange={setSeverity}
        />
      </div>

      {loading ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-navy-600 mb-2" size={28} />
          <p className="text-sm text-slate-500">Checking AI anomaly detection and access telemetry…</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No security alerts"
          description="System security parameters normal. No access anomalies or unauthorized intrusion attempts detected."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const isHigh = a.flagged || (a.anomaly_score && a.anomaly_score > 0.7)
            return (
              <div key={a.id} className="card p-4 flex items-start gap-3">
                <div className={`rounded-lg p-2 shrink-0 ${isHigh ? 'text-red-500 bg-red-50' : 'text-amber-500 bg-amber-50'}`}>
                  {isHigh ? <AlertTriangle size={18} /> : <AlertCircle size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-navy-900 text-sm">
                      {a.action} by {a.username || 'User'}
                    </p>
                    <span className={`badge shrink-0 ${isHigh ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isHigh ? 'High Priority' : 'Notice'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Document: {a.document_title || 'N/A'} · IP: {a.ip_address || '127.0.0.1'} · Device: {a.device_info || 'Secured Client'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {a.timestamp ? new Date(a.timestamp).toLocaleString() : 'Recent'} · Anomaly Score: {a.anomaly_score ? a.anomaly_score.toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
