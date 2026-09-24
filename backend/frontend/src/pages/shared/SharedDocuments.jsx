import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, LayoutGrid, List as ListIcon, Loader2 } from 'lucide-react'
import { PageHeader, SearchInput, FilterPills } from '../../components/common/Controls'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import { EmptyState } from '../../components/common/States'
import { fetchDocuments } from '../../api/realApi'

const CATEGORIES = ['All', 'FIR', 'Statements', 'Evidence', 'Forensic Reports', 'Charge Sheet', 'Reports', 'Orders']

export default function SharedDocuments({ basePath = '/admin', title = 'All Documents' }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('list')
  const navigate = useNavigate()

  useEffect(() => {
    async function loadDocs() {
      setLoading(true)
      try {
        const data = await fetchDocuments()
        setDocuments(Array.isArray(data) ? data : data?.results || [])
      } catch (err) {
        console.error('Failed to load documents:', err)
        setDocuments([])
      } finally {
        setLoading(false)
      }
    }
    loadDocs()
  }, [])

  const filtered = useMemo(() => {
    let list = documents
    if (category !== 'All') list = list.filter((d) => (d.category || d.document_type) === category)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((d) =>
        (d.title || d.name || '').toLowerCase().includes(q) ||
        (d.case_number || d.caseId || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [documents, category, query])

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={loading ? 'Loading documents…' : `Showing ${filtered.length} documents in total`}
        actions={
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-navy-700 text-white' : 'bg-white text-slate-400'}`}>
              <ListIcon size={16} />
            </button>
            <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-navy-700 text-white' : 'bg-white text-slate-400'}`}>
              <LayoutGrid size={16} />
            </button>
          </div>
        }
      />

      <div className="card p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <FilterPills
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          active={category}
          onChange={setCategory}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search documents…" className="md:w-72" />
      </div>

      {loading ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-navy-600 mb-2" size={28} />
          <p className="text-sm text-slate-500">Retrieving documents from repository…</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No documents found"
          description={query ? "No documents match your search query." : "No documents have been filed in this category yet."}
        />
      ) : view === 'list' ? (
        <div className="card p-4">
          <DataTable
            onRowClick={(row) => navigate(`${basePath}/documents/${row.id}`)}
            columns={[
              {
                key: 'title',
                header: 'Document Title',
                render: (row) => (
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-navy-50 p-2 text-navy-600 shrink-0">
                      <FileText size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-navy-800 text-sm truncate">{row.title || row.name}</p>
                      <p className="text-xs text-slate-400">{row.file_size ? `${(row.file_size / 1024).toFixed(1)} KB` : 'Secured'}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'case',
                header: 'Case Docket',
                render: (row) => row.case_number || (row.case && typeof row.case === 'object' ? row.case.case_number : '') || (row.case && typeof row.case === 'string' && row.case.length < 30 ? row.case : '') || 'Case Document',
              },
              {
                key: 'category',
                header: 'Category',
                render: (row) => row.category || row.document_type || 'Document',
              },
              {
                key: 'status',
                header: 'Verification Status',
                render: (row) => {
                  const isVer = row.status === 'VERIFIED' || row.status === 'APPROVED'
                  const isRej = row.status === 'REJECTED'
                  return <Badge status={isVer ? 'Verified' : isRej ? 'Rejected' : 'Not Verified'} />
                },
              },
            ]}
            data={filtered}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => navigate(`${basePath}/documents/${d.id}`)}
              className="card p-4 text-left hover:border-navy-300 border border-transparent transition"
            >
              <div className="rounded-lg bg-navy-50 p-2.5 text-navy-600 w-fit mb-3">
                <FileText size={20} />
              </div>
              <p className="font-medium text-navy-800 text-sm truncate">{d.title || d.name}</p>
              <p className="text-xs text-slate-400 mb-2">
                {d.case_number || d.caseId || 'Case Document'} · {d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : 'Secured'}
              </p>
              <Badge status={d.status === 'VERIFIED' || d.status === 'APPROVED' ? 'Verified' : d.status === 'REJECTED' ? 'Rejected' : 'Not Verified'} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
