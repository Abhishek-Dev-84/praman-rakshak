import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, PenLine, AlertTriangle, ChevronRight, Loader2, FileText } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import Badge from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import { EmptyState } from '../../components/common/States'
import { useAuth } from '../../context/AuthContext'
import { fetchCases, fetchDocuments } from '../../api/realApi'
import { subscribeToGlobalAudit } from '../../api/websocketService'

export default function JudgeDocket() {
  const { user } = useAuth()
  const [cases, setCases] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadJudgeData(silent = false) {
      if (!silent) setLoading(true)
      try {
        const [cData, dData] = await Promise.all([
          fetchCases(),
          fetchDocuments(),
        ])
        setCases(Array.isArray(cData) ? cData : cData?.results || [])
        setDocuments(Array.isArray(dData) ? dData : dData?.results || [])
      } catch (err) {
        console.error('Failed to load judge docket:', err)
      } finally {
        if (!silent) setLoading(false)
      }
    }
    loadJudgeData()

    const unsubscribe = subscribeToGlobalAudit(
      () => {
        loadJudgeData(true)
      },
      () => {}
    )

    return () => {
      unsubscribe()
    }
  }, [])

  const pendingDocs = documents.filter((d) => {
    const s = (d.status || '').toUpperCase()
    return s === 'PENDING' || s === 'PROCESSING' || s === 'PENDING REVIEW' || s === 'ACTIVE'
  }).slice(0, 4)

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name || user?.username || 'Honorable Judge'}`}
        subtitle={`${user?.designation || 'Presiding Judicial Officer'} · ${user?.department || 'District Sessions Court'}`}
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={Briefcase} label="Active Court Dockets" value={loading ? '…' : String(cases.length)} accent="text-navy-700 bg-navy-50" />
        <StatCard icon={PenLine} label="Orders & Statements" value={loading ? '…' : String(documents.length)} accent="text-gold-700 bg-gold-50" />
        <StatCard icon={AlertTriangle} label="Integrity Flags" value="0" accent="text-emerald-700 bg-emerald-50" />
      </div>

      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-navy-900 text-sm">Documents Requiring Judicial Review</p>
          <Link to="/judge/documents" className="text-xs font-semibold text-navy-600 hover:underline">
            View all ({documents.length})
          </Link>
        </div>
        {loading ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-navy-600 mb-1" size={24} />
            <p className="text-xs text-slate-400">Loading documents…</p>
          </div>
        ) : pendingDocs.length === 0 ? (
          <EmptyState title="No pending documents" description="No orders or chargesheets currently require signature." />
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-800 truncate">{doc.title || doc.name}</p>
                  <p className="text-xs text-slate-400">
                    Case: {doc.case_number || 'CrPC Record'} · Uploaded by {doc.uploaded_by_username || 'Officer'}
                  </p>
                </div>
                <Link
                  to={`/judge/review/${doc.id}`}
                  className="btn-gold btn-sm shrink-0 ml-3"
                >
                  Review & Certify
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-navy-900 text-sm">Today's Active Judicial Dockets</p>
          <span className="text-xs text-slate-400">{cases.length} cases</span>
        </div>
        {loading ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-navy-600 mb-1" size={24} />
            <p className="text-xs text-slate-400">Loading case dockets…</p>
          </div>
        ) : cases.length === 0 ? (
          <EmptyState title="No active cases" description="No case dockets registered on the judicial roster." />
        ) : (
          <div className="divide-y divide-slate-100">
            {cases.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                to={`/judge/cases/${c.id}`}
                className="flex items-center justify-between py-3.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-navy-50 p-2 text-navy-700 shrink-0">
                    <Briefcase size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-800 truncate">{c.case_number || c.id}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {c.title} · {c.court || 'Court of Session'}
                    </p>
                  </div>
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
    </div>
  )
}
