import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Loader2, RefreshCw } from 'lucide-react'
import { PageHeader, Tabs, SearchInput } from '../../components/common/Controls'
import Badge from '../../components/common/Badge'
import { EmptyState } from '../../components/common/States'
import { fetchDocuments } from '../../api/realApi'
import { subscribeToGlobalAudit } from '../../api/websocketService'

export default function JudgeReview() {
  const [tab, setTab] = useState('pending')
  const [query, setQuery] = useState('')
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadDocuments = async () => {
    try {
      const data = await fetchDocuments()
      const list = Array.isArray(data) ? data : data?.results || []
      setDocuments(list)
    } catch (err) {
      console.error('Failed to load documents for judicial review:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()

    const unsub = subscribeToGlobalAudit((newLog) => {
      if (
        newLog.action === 'DOC_UPLOAD' ||
        newLog.action === 'DOC_VERIFY' ||
        newLog.action === 'DOC_DELETE' ||
        newLog.action === 'DOC_TAMPER'
      ) {
        loadDocuments()
      }
    })

    return () => unsub()
  }, [])

  let docs = documents
  if (tab === 'pending') {
    docs = docs.filter((d) => (d.status || '').toUpperCase() === 'PENDING' || (d.status || '').toUpperCase() === 'PENDING REVIEW' || !d.status)
  } else if (tab === 'verified') {
    docs = docs.filter((d) => (d.status || '').toUpperCase() === 'VERIFIED' || (d.status || '').toUpperCase() === 'APPROVED')
  }

  if (query) {
    const q = query.toLowerCase()
    docs = docs.filter((d) =>
      (d.title || '').toLowerCase().includes(q) ||
      (d.case_number || '').toLowerCase().includes(q) ||
      (d.category || '').toLowerCase().includes(q)
    )
  }

  return (
    <div>
      <PageHeader
        title="Document Review"
        subtitle="Records awaiting judicial review and cryptographic certification"
        actions={
          <button
            onClick={loadDocuments}
            className="btn-outline btn-sm flex items-center gap-1.5"
            title="Refresh documents"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      <div className="card p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Tabs
          tabs={[
            { value: 'pending', label: 'Pending Review' },
            { value: 'verified', label: 'Verified & Certified' },
            { value: 'all', label: 'All Records' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search records…" className="md:w-72" />
      </div>

      {loading ? (
        <div className="card p-12 flex justify-center items-center">
          <Loader2 className="animate-spin text-navy-600" size={32} />
        </div>
      ) : docs.length === 0 ? (
        <div className="card">
          <EmptyState title="Nothing pending" description="All records in this view have been reviewed." />
        </div>
      ) : (
        <div className="card p-4 divide-y divide-slate-100">
          {docs.map((d) => (
            <button
              key={d.id}
              onClick={() => navigate(`/judge/review/${d.id}`)}
              className="w-full flex items-center justify-between py-3.5 text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-lg bg-navy-50 p-2 text-navy-600 shrink-0">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-800 truncate">{d.title}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {d.case_number ? `Case ${d.case_number}` : d.category || 'Docket Document'} · Submitted by {d.uploaded_by_name || 'Officer'} · {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : 'Recent'}
                  </p>
                </div>
              </div>
              <Badge status={d.status || 'PENDING'} className="shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
