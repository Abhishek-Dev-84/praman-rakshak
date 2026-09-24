import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, FileText, UploadCloud, AlertTriangle, Loader2, ShieldCheck, ChevronRight } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import StatCard from '../../components/common/StatCard'
import Badge from '../../components/common/Badge'
import { EmptyState } from '../../components/common/States'
import { useAuth } from '../../context/AuthContext'
import { fetchCases, fetchDocuments, fetchEvidenceStats, fetchAnomalies } from '../../api/realApi'
import { subscribeToGlobalAudit } from '../../api/websocketService'

export default function PoliceDashboard() {
  const { user } = useAuth()
  const [cases, setCases] = useState([])
  const [documents, setDocuments] = useState([])
  const [evidenceStats, setEvidenceStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPoliceDashboard(silent = false) {
      if (!silent) setLoading(true)
      try {
        const [cData, dData, eStats, aData] = await Promise.all([
          fetchCases(),
          fetchDocuments(),
          fetchEvidenceStats().catch(() => null),
          fetchAnomalies().catch(() => []),
        ])
        setCases(Array.isArray(cData) ? cData : cData?.results || [])
        setDocuments(Array.isArray(dData) ? dData : dData?.results || [])
        setEvidenceStats(eStats)
        setAlerts(Array.isArray(aData) ? aData : aData?.results || [])
      } catch (err) {
        console.error('Failed to load police dashboard:', err)
      } finally {
        if (!silent) setLoading(false)
      }
    }
    loadPoliceDashboard()

    const unsubscribe = subscribeToGlobalAudit(
      (newLog) => {
        // Automatically resynchronize data on any relevant event
        loadPoliceDashboard(true)
      },
      () => {}
    )

    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name || user?.username || 'Officer'}`}
        subtitle={`${user?.designation || 'Police Station Officer'} · Station Jurisdiction: ${user?.department || 'Central Police Station'}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={FolderOpen} label="My Cases" value={loading ? '…' : String(cases.length)} trend="Active FIRs" accent="text-navy-700 bg-navy-50" />
        <StatCard icon={FileText} label="Digital Records" value={loading ? '…' : String(documents.length)} accent="text-gold-700 bg-gold-50" />
        <StatCard icon={ShieldCheck} label="Physical Evidence" value={loading ? '…' : String(evidenceStats?.total_evidence ?? 0)} accent="text-emerald-700 bg-emerald-50" />
        <StatCard icon={AlertTriangle} label="Security Alerts" value={loading ? '…' : String(alerts.filter(a => a.flagged).length)} accent="text-red-700 bg-red-50" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-navy-900 text-sm">Active Case Dockets & FIRs</p>
            <Link to="/police/cases" className="text-xs font-semibold text-navy-600 hover:underline">
              View all ({cases.length})
            </Link>
          </div>
          {loading ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-navy-600 mb-1" size={24} />
              <p className="text-xs text-slate-400">Loading cases…</p>
            </div>
          ) : cases.length === 0 ? (
            <EmptyState title="No active cases" description="No FIR or case dockets assigned." />
          ) : (
            <div className="divide-y divide-slate-100">
              {cases.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  to={`/police/cases/${c.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-800 truncate">
                      {c.case_number || c.id} — {c.title}
                    </p>
                    <p className="text-xs text-slate-400">Registered: {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active'}</p>
                  </div>
                  <Badge status={c.status || 'Active'} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-navy-900 text-sm">Recent Digital Documents</p>
            <Link to="/police/documents" className="text-xs font-semibold text-navy-600 hover:underline">
              View all ({documents.length})
            </Link>
          </div>
          {loading ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-navy-600 mb-1" size={24} />
              <p className="text-xs text-slate-400">Loading documents…</p>
            </div>
          ) : documents.length === 0 ? (
            <EmptyState title="No documents" description="No digital documents filed yet." />
          ) : (
            <div className="divide-y divide-slate-100">
              {documents.slice(0, 4).map((d) => (
                <Link
                  key={d.id}
                  to={`/police/documents/${d.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-800 truncate">{d.title || d.name}</p>
                    <p className="text-xs text-slate-400">{d.case_number || 'CrPC Record'}</p>
                  </div>
                  <Badge status={d.status || 'Verified'} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Link
        to="/police/upload"
        className="fixed bottom-20 lg:bottom-8 right-6 h-12 w-12 rounded-full bg-navy-700 text-white shadow-lg flex items-center justify-center hover:bg-navy-800 transition"
        title="Upload & Seal Document"
      >
        <UploadCloud size={20} />
      </Link>
    </div>
  )
}
