import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, FileText, ClipboardList, AlertTriangle, ChevronRight, Loader2, ShieldCheck, Clock, Plus } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import StatCard from '../../components/common/StatCard'
import Badge from '../../components/common/Badge'
import { EmptyState } from '../../components/common/States'
import { useAuth } from '../../context/AuthContext'
import { fetchCases, fetchDocuments, fetchEvidenceStats } from '../../api/realApi'
import { subscribeToGlobalAudit } from '../../api/websocketService'

export default function InvestigatorDashboard() {
  const { user } = useAuth()
  const [cases, setCases] = useState([])
  const [documents, setDocuments] = useState([])
  const [evidenceStats, setEvidenceStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard(silent = false) {
      if (!silent) setLoading(true)
      try {
        const [cData, dData, eStats] = await Promise.all([
          fetchCases(),
          fetchDocuments(),
          fetchEvidenceStats().catch(() => null),
        ])
        setCases(Array.isArray(cData) ? cData : cData?.results || [])
        setDocuments(Array.isArray(dData) ? dData : dData?.results || [])
        setEvidenceStats(eStats)
      } catch (err) {
        console.error('Failed to load investigator dashboard data:', err)
      } finally {
        if (!silent) setLoading(false)
      }
    }
    loadDashboard()

    const unsubscribe = subscribeToGlobalAudit(
      (newLog) => {
        loadDashboard(true)
      },
      () => {}
    )

    return () => {
      unsubscribe()
    }
  }, [])

  const pendingDocApprovals = useMemo(() => {
    return documents.filter((d) => d.status !== 'VERIFIED' && d.status !== 'APPROVED' && d.status !== 'REJECTED')
  }, [documents])

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name || user?.username || 'Investigator'}`}
        subtitle={`${user?.designation || 'Forensic Investigator'} · ID: ${user?.id || user?.username}`}
        actions={
          <Link
            to="/investigator/cases?create=true"
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus size={16} />
            Register Case Docket
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Briefcase} label="Cases Assigned" value={loading ? '…' : String(cases.length)} accent="text-navy-700 bg-navy-50" />
        <Link to="/investigator/tasks">
          <StatCard
            icon={Clock}
            label="Pending Approvals"
            value={loading ? '…' : String(pendingDocApprovals.length)}
            accent={pendingDocApprovals.length > 0 ? 'text-amber-700 bg-amber-100 ring-2 ring-amber-400' : 'text-slate-700 bg-slate-50'}
          />
        </Link>
        <StatCard icon={FileText} label="Digital Documents" value={loading ? '…' : String(documents.length)} accent="text-blue-700 bg-blue-50" />
        <StatCard icon={ShieldCheck} label="Pending Movements" value={loading ? '…' : String(evidenceStats?.pending_movements ?? 0)} accent="text-emerald-700 bg-emerald-50" />
      </div>

      {pendingDocApprovals.length > 0 && (
        <div className="card p-4 mb-5 bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <Clock size={20} className="animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                {pendingDocApprovals.length} Document{pendingDocApprovals.length > 1 ? 's' : ''} Awaiting Your Investigative Endorsement
              </p>
              <p className="text-xs text-amber-800">
                Uploaded by police officers to your assigned case dockets. Review and approve or reject in your tasks.
              </p>
            </div>
          </div>
          <Link
            to="/investigator/tasks"
            className="btn-primary btn-sm !bg-amber-600 hover:!bg-amber-700 text-white shrink-0 self-start sm:self-center"
          >
            Review & Endorse
          </Link>
        </div>
      )}

      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-navy-900 text-sm">Assigned Case Dockets</p>
          <Link to="/investigator/cases" className="text-xs font-semibold text-blue-600 hover:underline">
            View all ({cases.length})
          </Link>
        </div>
        {loading ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-navy-600 mb-1" size={24} />
            <p className="text-xs text-slate-400">Loading cases…</p>
          </div>
        ) : cases.length === 0 ? (
          <EmptyState title="No assigned cases" description="You have no active case dockets assigned at this time." />
        ) : (
          <div className="divide-y divide-slate-100">
            {cases.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                to={`/investigator/cases/${c.id}`}
                className="flex items-center justify-between py-3.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-800 truncate">
                    {c.case_number || c.id} — {c.title}
                  </p>
                  <p className="text-xs text-slate-400">Registered: {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge status={c.status || 'Active'} />
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-navy-900 text-sm">Recent Evidence & Documents</p>
          <Link to="/investigator/documents" className="text-xs font-semibold text-blue-600 hover:underline">
            View all ({documents.length})
          </Link>
        </div>
        {loading ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-navy-600 mb-1" size={24} />
            <p className="text-xs text-slate-400">Loading documents…</p>
          </div>
        ) : documents.length === 0 ? (
          <EmptyState title="No documents" description="No evidence documents uploaded yet." />
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.slice(0, 5).map((d) => (
              <Link
                key={d.id}
                to={`/investigator/documents/${d.id}`}
                className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-800 truncate">{d.title || d.name}</p>
                  <p className="text-xs text-slate-400">{d.case_number || 'CrPC Record'} · {d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}</p>
                </div>
                <Badge status={d.status || 'Verified'} className="shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
