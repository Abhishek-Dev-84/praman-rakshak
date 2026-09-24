import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Scale, ChevronRight, Loader2 } from 'lucide-react'
import { PageHeader, SearchInput, FilterPills } from '../../components/common/Controls'
import Badge from '../../components/common/Badge'
import { EmptyState } from '../../components/common/States'
import { fetchCases } from '../../api/realApi'

export default function LegalCases() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('All')
  const [query, setQuery] = useState('')

  useEffect(() => {
    async function loadLegalCases() {
      setLoading(true)
      try {
        const data = await fetchCases()
        setCases(Array.isArray(data) ? data : data?.results || [])
      } catch (err) {
        console.error('Failed to load legal cases:', err)
        setCases([])
      } finally {
        setLoading(false)
      }
    }
    loadLegalCases()
  }, [])

  const filtered = useMemo(() => {
    let list = cases
    if (status !== 'All') {
      if (status === 'Active') list = list.filter((c) => c.status !== 'CLOSED')
      if (status === 'Closed') list = list.filter((c) => c.status === 'CLOSED')
    }
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(
        (c) =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.case_number || c.id || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [cases, status, query])

  return (
    <div>
      <PageHeader title="Legal Officer Case Dockets" subtitle={loading ? "Loading permitted case dockets…" : `${cases.length} cases assigned for legal review`} />

      <div className="card p-4 mb-4 space-y-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search case dockets by title or FIR number…" />
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-1.5">Docket Status</p>
          <FilterPills
            options={['All', 'Active', 'Closed'].map((s) => ({ value: s, label: s }))}
            active={status}
            onChange={setStatus}
          />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-navy-600 mb-2" size={28} />
          <p className="text-sm text-slate-500">Loading legal dockets…</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No cases found"
          description={query ? "No cases match your search criteria." : "No active case dockets available for legal review."}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/legal/cases/${c.id}`}
              className="card p-4 flex items-center justify-between hover:border-forest-400 border border-transparent transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-lg bg-forest-50 p-2.5 text-forest-700 shrink-0">
                  <Scale size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900 text-sm truncate">
                    {c.case_number || c.id} — {c.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    Court: {c.court || 'Sessions Court'} · Registered: {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active'}
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
  )
}
