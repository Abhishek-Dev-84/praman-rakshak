import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Briefcase, ChevronRight, Loader2, Plus, ShieldAlert } from 'lucide-react'
import { PageHeader, Tabs, SearchInput } from '../../components/common/Controls'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { EmptyState } from '../../components/common/States'
import { useUI } from '../../context/UIContext'
import { fetchCases, fetchUsers, createCase } from '../../api/realApi'

export default function InvestigatorCases() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchParams] = useSearchParams()
  const { pushToast } = useUI()

  const loadCases = async () => {
    setLoading(true)
    try {
      const casesData = await fetchCases()
      setCases(Array.isArray(casesData) ? casesData : casesData?.results || [])
    } catch (err) {
      console.error('Failed to load investigator cases:', err)
      setCases([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [])

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateOpen(true)
    }
  }, [searchParams])

  const filtered = useMemo(() => {
    let list = cases
    if (tab === 'active') list = list.filter((c) => c.status !== 'CLOSED')
    if (tab === 'closed') list = list.filter((c) => c.status === 'CLOSED')
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(
        (c) =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.case_number || c.id || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [cases, tab, query])

  const handleCreateCase = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.target)
    try {
      const payload = {
        case_number: form.get('case_number')?.trim(),
        title: form.get('title')?.trim(),
        case_type: form.get('case_type')?.trim() || 'FIR',
        description: form.get('description')?.trim() || '',
      }
      await createCase(payload)
      pushToast({
        type: 'success',
        title: 'Case Docket Registered',
        message: 'New case docket registered successfully in SDMS.',
      })
      setCreateOpen(false)
      loadCases()
    } catch (err) {
      pushToast({ type: 'error', title: 'Failed to create case', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Investigative Case Dockets"
        subtitle={loading ? "Loading case repository…" : `${cases.length} total cases in database`}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus size={16} />
            Register Case Docket
          </button>
        }
      />

      <div className="card p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Tabs
          tabs={[
            { value: 'all', label: 'All Cases', count: cases.length },
            { value: 'active', label: 'Active', count: cases.filter((c) => c.status !== 'CLOSED').length },
            { value: 'closed', label: 'Closed', count: cases.filter((c) => c.status === 'CLOSED').length },
          ]}
          active={tab}
          onChange={setTab}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search cases by FIR number or title…" className="md:w-80" />
      </div>

      {loading ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-navy-600 mb-2" size={28} />
          <p className="text-sm text-slate-500">Retrieving case dockets from database…</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No case records found"
          description={query ? "No cases match your search query." : "No case dockets found in this category."}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/investigator/cases/${c.id}`}
              className="card p-4 flex items-center justify-between hover:border-blue-400 border border-transparent transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 shrink-0">
                  <Briefcase size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900 text-sm truncate">
                    {c.case_number || c.id} — {c.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    Court: {c.court || 'Sessions Court'} · Registered: {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assigned Lead: {c.created_by_username || 'Investigator'} · {c.sections || 'BNS / CrPC Docket'}
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

      {/* Investigator Case Creation Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Register Case Docket (Investigator)">
        <form onSubmit={handleCreateCase} className="space-y-3.5">
          <div>
            <label className="label">FIR / Case Docket Number</label>
            <input name="case_number" required className="input" placeholder="e.g. FIR-2026-00912" />
          </div>
          <div>
            <label className="label">Case Docket Title</label>
            <input name="title" required className="input" placeholder="e.g. State Investigation vs. Forensic Evidence Syndicate" />
          </div>
          <div>
            <label className="label">Case Type / Docket Classification</label>
            <select name="case_type" defaultValue="FIR" className="input text-sm">
              <option value="FIR">FIR</option>
              <option value="Victim/Complainant Statement">Victim/Complainant Statement</option>
              <option value="Witness Statements">Witness Statements</option>
              <option value="Arrest Records">Arrest Records</option>
              <option value="Search & Seizure Memo">Search & Seizure Memo</option>
              <option value="Evidence List">Evidence List</option>
              <option value="Digital Evidence Record">Digital Evidence Record</option>
              <option value="Medical/MLC Record">Medical/MLC Record</option>
              <option value="Forensic/FSL Record">Forensic/FSL Record</option>
            </select>
          </div>
          <div>
            <label className="label">Preliminary Investigation Synopsis</label>
            <textarea
              name="description"
              rows={3}
              className="input"
              placeholder="Enter investigation scope, evidence anchors, and preliminary details..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-outline btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary btn-sm">
              {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
              {submitting ? 'Registering Docket…' : 'Register Case Docket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
