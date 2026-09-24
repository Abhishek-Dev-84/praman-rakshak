import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Briefcase, Loader2, Plus, FileText } from 'lucide-react'
import { PageHeader, Tabs, SearchInput } from '../../components/common/Controls'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { EmptyState } from '../../components/common/States'
import { useUI } from '../../context/UIContext'
import { fetchCases, createCase } from '../../api/realApi'

export default function PoliceCases() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { pushToast } = useUI()

  async function loadCases() {
    setLoading(true)
    try {
      const data = await fetchCases()
      setCases(Array.isArray(data) ? data : data?.results || [])
    } catch (err) {
      console.error('Failed to load police cases:', err)
      setCases([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [])

  const handleCreateCase = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      case_number: form.get('case_number')?.trim(),
      title: form.get('title')?.trim(),
      case_type: form.get('case_type')?.trim() || 'FIR',
      description: form.get('description')?.trim() || '',
      status: 'OPEN',
    }

    try {
      const newCase = await createCase(payload)
      pushToast({
        type: 'success',
        title: 'FIR Docket Registered',
        message: `Case ${payload.case_number} registered. You can now upload the FIR document directly.`,
      })
      setCreateOpen(false)
      loadCases()
      // Optional: direct to upload or detail
    } catch (err) {
      pushToast({ type: 'error', title: 'Registration Failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

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

  const defaultFirNumber = `FIR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

  return (
    <div>
      <PageHeader
        title="Police Case Dockets & FIRs"
        subtitle={loading ? "Loading station records…" : `${cases.length} total cases recorded`}
        action={
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <Plus size={16} /> Register New FIR / Case
          </button>
        }
      />

      <div className="card p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Tabs
          tabs={[
            { value: 'all', label: 'All Cases', count: cases.length },
            { value: 'active', label: 'Active Investigation', count: cases.filter((c) => c.status !== 'CLOSED').length },
            { value: 'closed', label: 'Closed', count: cases.filter((c) => c.status === 'CLOSED').length },
          ]}
          active={tab}
          onChange={setTab}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search FIRs by number or title…" className="md:w-72" />
      </div>

      {loading ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-navy-600 mb-2" size={28} />
          <p className="text-sm text-slate-500">Loading case records…</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No cases found"
          description={query ? "No FIR or case records match your search query." : "No case records found in this category."}
        />
      ) : (
        <div className="card p-4 divide-y divide-slate-100">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/police/cases/${c.id}`}
              className="flex items-center justify-between py-3.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-lg bg-navy-50 p-2 text-navy-700 shrink-0">
                  <Briefcase size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-800 truncate">{c.case_number || c.id} — {c.title}</p>
                  <p className="text-xs text-slate-400">
                    Court: {c.court || 'Sessions Court'} · Registered: {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active'}
                  </p>
                </div>
              </div>
              <Badge status={c.status || 'Active'} className="shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Register New FIR Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Register New Case / FIR Docket">
        <form onSubmit={handleCreateCase} className="space-y-3.5">
          <div className="bg-navy-50/70 border border-navy-100 rounded-lg p-3 text-xs text-navy-800">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <FileText size={14} className="text-navy-600" />
              Police First Information Report (FIR) Registration
            </p>
            <p className="text-slate-600">
              Register an official police FIR. Once registered, upload the signed/sealed FIR document directly without requiring prior approval.
            </p>
          </div>

          <div>
            <label className="label">FIR / Case Docket Number</label>
            <input
              name="case_number"
              defaultValue={defaultFirNumber}
              required
              className="input text-sm font-mono"
              placeholder="e.g. FIR-2026-0042"
            />
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
            <label className="label">FIR Title / Case Heading</label>
            <input
              name="title"
              required
              className="input text-sm"
              placeholder="e.g. State vs. Unknown - Armed Robbery at Sector 4"
            />
          </div>

          <div>
            <label className="label">Station General Diary Synopsis / Description</label>
            <textarea
              name="description"
              rows={3}
              className="input text-sm resize-none"
              placeholder="Enter occurrence details, complainant allegations, and initial police intake synopsis..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="btn-outline btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
              {submitting ? 'Registering Docket…' : 'Register FIR Docket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
