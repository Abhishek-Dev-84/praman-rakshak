import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Loader2, Eye, UserCheck, Fingerprint, Search } from 'lucide-react'
import { PageHeader, SearchInput, Tabs } from '../../components/common/Controls'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { useUI } from '../../context/UIContext'
import { fetchCases, fetchUsers, createCase, updateCase, deleteCase, assignCase } from '../../api/realApi'

export default function AdminCases() {
  const [cases, setCases] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editCase, setEditCase] = useState(null)
  const [assignModalCase, setAssignModalCase] = useState(null)
  const [ioSearchQuery, setIoSearchQuery] = useState('')
  const [deleteTargetCase, setDeleteTargetCase] = useState(null)
  const [deletePin, setDeletePin] = useState('')
  const [pinError, setPinError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { pushToast } = useUI()

  const loadCases = async () => {
    setLoading(true)
    try {
      const [data, uList] = await Promise.all([
        fetchCases(),
        fetchUsers().catch(() => []),
      ])
      setCases(Array.isArray(data) ? data : data?.results || [])
      setUsers(Array.isArray(uList) ? uList : uList?.results || [])
    } catch (err) {
      console.error(err)
      pushToast({ type: 'error', title: 'Failed to load cases', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [])

  const filtered = useMemo(() => {
    let list = cases
    if (tab === 'open') list = list.filter((c) => c.status === 'OPEN')
    if (tab === 'closed') list = list.filter((c) => c.status === 'CLOSED')
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(
        (c) =>
          c.case_number?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
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
      const assignedUserId = form.get('assigned_user_id')
      if (assignedUserId) {
        payload.assigned_user_id = assignedUserId
      }
      await createCase(payload)
      pushToast({ type: 'success', title: 'Case Created', message: 'New docket registered in SDMS and assigned.' })
      setCreateOpen(false)
      loadCases()
    } catch (err) {
      pushToast({ type: 'error', title: 'Failed to create case', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateCase = async (e) => {
    e.preventDefault()
    if (!editCase) return
    setSubmitting(true)
    const form = new FormData(e.target)
    try {
      const payload = {
        title: form.get('title')?.trim(),
        case_type: form.get('case_type')?.trim() || editCase.case_type || 'FIR',
        description: form.get('description')?.trim() || '',
        status: form.get('status'),
      }
      const assignedUserId = form.get('assigned_user_id')
      if (assignedUserId) {
        payload.assigned_user_id = assignedUserId
      }
      await updateCase(editCase.id, payload)
      pushToast({ type: 'success', title: 'Case Updated', message: `Docket ${editCase.case_number} updated.` })
      setEditCase(null)
      loadCases()
    } catch (err) {
      pushToast({ type: 'error', title: 'Failed to update case', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCase = async () => {
    if (!deleteTargetCase) return
    if (deletePin !== '1234' && deletePin !== '123456') {
      setPinError('Invalid Security PIN. Enter officer PIN (1234) to authorize deletion.')
      return
    }
    setSubmitting(true)
    setPinError('')
    try {
      await deleteCase(deleteTargetCase.id)
      pushToast({ type: 'success', title: 'Case Deleted', message: `Docket ${deleteTargetCase.case_number} removed.` })
      setDeleteTargetCase(null)
      setDeletePin('')
      loadCases()
    } catch (err) {
      pushToast({ type: 'error', title: 'Failed to delete case', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssignIO = async (caseId, officerId, officerName) => {
    setSubmitting(true)
    try {
      await assignCase(caseId, officerId, 'INVESTIGATOR')
      pushToast({
        type: 'success',
        title: 'Investigation Officer Assigned',
        message: `${officerName} assigned to lead investigation on ${assignModalCase?.case_number}.`,
      })
      setAssignModalCase(null)
      loadCases()
    } catch (err) {
      pushToast({ type: 'error', title: 'Assignment Failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const investigationOfficers = useMemo(() => {
    return users.filter((u) => {
      if (u.role !== 'INVESTIGATOR') return false
      if (!ioSearchQuery) return true
      const q = ioSearchQuery.toLowerCase()
      return (
        (u.username || '').toLowerCase().includes(q) ||
        (u.badge_number || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      )
    })
  }, [users, ioSearchQuery])

  return (
    <div>
      <PageHeader
        title="Jurisdictional Cases & Dockets"
        subtitle={`Showing ${filtered.length} of ${cases.length} registered cases`}
        actions={
          <button onClick={() => setCreateOpen(true)} className="btn-primary btn-sm">
            <Plus size={16} /> Create New Case Docket
          </button>
        }
      />

      <div className="card p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Tabs
          tabs={[
            { value: 'all', label: 'All Dockets', count: cases.length },
            { value: 'open', label: 'Active Investigation', count: cases.filter((c) => c.status === 'OPEN').length },
            { value: 'closed', label: 'Closed / Judged', count: cases.filter((c) => c.status === 'CLOSED').length },
          ]}
          active={tab}
          onChange={setTab}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search cases or FIRs…" className="md:w-72" />
      </div>

      <div className="card p-4">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading case records from database...</div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'case',
                header: 'Case / FIR Number',
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{row.title}</p>
                    <p className="text-xs font-mono font-bold text-blue-700">{row.case_number}</p>
                  </div>
                ),
              },
              {
                key: 'created_by',
                header: 'Registering Officer',
                render: (row) => <span className="text-slate-600 text-xs">{row.created_by_username || 'Officer'}</span>,
              },
              {
                key: 'assigned_users',
                header: 'Investigation Lead (IO)',
                render: (row) => {
                  if (row.assigned_users && row.assigned_users.length > 0) {
                    return (
                      <button
                        onClick={() => setAssignModalCase(row)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition"
                        title="Click to reassign Investigation Officer"
                      >
                        <UserCheck size={12} className="text-emerald-600" />
                        {row.assigned_users.map(u => u.username).join(', ')}
                      </button>
                    )
                  }
                  return (
                    <button
                      onClick={() => setAssignModalCase(row)}
                      className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded hover:bg-amber-100 transition flex items-center gap-1 font-medium"
                      title="Assign an Investigation Officer to this case"
                    >
                      <UserCheck size={11} className="text-amber-600" /> Assign IO
                    </button>
                  )
                },
              },
              { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
              {
                key: 'created_at',
                header: 'Filing Date',
                render: (row) => (
                  <span className="text-slate-500 text-xs">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                ),
              },
            ]}
            data={filtered}
            actions={(row) => (
              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setAssignModalCase(row)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition-colors"
                  title="Assign Investigation Officer (IO)"
                >
                  <UserCheck size={15} />
                </button>
                <button
                  onClick={() => navigate(`/admin/cases/${row.id}`)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700 transition-colors"
                  title="View Case Details"
                >
                  <Eye size={15} />
                </button>
                <button
                  onClick={() => setEditCase(row)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700 transition-colors"
                  title="Edit Case Details"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setDeleteTargetCase(row)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
                  title="Delete Case Docket"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          />
        )}
      </div>

      {/* Create Case Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Register New Case Docket">
        <form onSubmit={handleCreateCase} className="space-y-3.5">
          <div>
            <label className="label">FIR / Case Number</label>
            <input name="case_number" required className="input" placeholder="e.g. FIR-2026-00512" />
          </div>
          <div>
            <label className="label">Case Title</label>
            <input name="title" required className="input" placeholder="e.g. State vs. R. K. Synthetics" />
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
            <label className="label">Assign Lead Officer (Optional)</label>
            <select name="assigned_user_id" className="input text-sm">
              <option value="">-- Unassigned (Assign Later) --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.role} - {u.department || 'HQ'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Initial Investigation Synopsis</label>
            <textarea name="description" rows={3} className="input" placeholder="Investigation details..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-outline btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary btn-sm">
              {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
              {submitting ? 'Registering…' : 'Register Case'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Case Modal */}
      <Modal open={!!editCase} onClose={() => setEditCase(null)} title={`Edit Docket: ${editCase?.case_number}`}>
        {editCase && (
          <form onSubmit={handleUpdateCase} className="space-y-3.5">
            <div>
              <label className="label">Case Title</label>
              <input name="title" defaultValue={editCase.title} required className="input" />
            </div>
            <div>
              <label className="label">Case Type / Docket Classification</label>
              <select name="case_type" defaultValue={editCase.case_type || 'FIR'} className="input text-sm">
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
              <label className="label">Case Status</label>
              <select name="status" defaultValue={editCase.status} className="input">
                <option value="OPEN">OPEN (Active Investigation)</option>
                <option value="CLOSED">CLOSED (Adjudicated / Filed)</option>
              </select>
            </div>
            <div>
              <label className="label">Assign Lead Officer / Investigator</label>
              <select
                name="assigned_user_id"
                defaultValue={editCase.assigned_users?.[0]?.id || ''}
                className="input"
              >
                <option value="">-- Keep Current / Unassigned --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role}) {u.badge_number ? `· ${u.badge_number}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Investigation Synopsis</label>
              <textarea name="description" defaultValue={editCase.description} rows={3} className="input" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditCase(null)} className="btn-outline btn-sm">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary btn-sm">
                {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Case Modal with Biometric / Security PIN Step-up */}
      <Modal
        open={!!deleteTargetCase}
        onClose={() => {
          setDeleteTargetCase(null)
          setDeletePin('')
          setPinError('')
        }}
        title="Authorize Case Deletion"
        footer={
          <>
            <button
              onClick={() => {
                setDeleteTargetCase(null)
                setDeletePin('')
                setPinError('')
              }}
              className="btn-outline btn-sm"
            >
              Cancel
            </button>
            <button onClick={handleDeleteCase} disabled={submitting || !deletePin} className="btn-danger btn-sm">
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
              {submitting ? 'Authenticating & Deleting…' : 'Authorize & Delete'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Permanently deleting case docket{' '}
            <span className="font-semibold text-slate-900">{deleteTargetCase?.case_number}</span> ({deleteTargetCase?.title}) is a critical action. An immutable cryptographic deletion block will be sealed into the ledger.
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <Fingerprint size={18} className="shrink-0 text-amber-700" />
            <span>Official Biometric / PIN authorization required to commit deletion.</span>
          </div>

          <div>
            <label className="label">Enter Security PIN / Officer Passkey</label>
            <input
              type="password"
              value={deletePin}
              onChange={(e) => {
                setDeletePin(e.target.value)
                setPinError('')
              }}
              placeholder="Enter PIN (e.g. 1234)"
              className="input text-center text-lg tracking-widest font-mono"
              autoFocus
            />
            {pinError && <p className="text-xs text-red-600 mt-1 font-semibold">{pinError}</p>}
          </div>
        </div>
      </Modal>

      {/* Assign Investigation Officer Modal */}
      <Modal
        open={!!assignModalCase}
        onClose={() => { setAssignModalCase(null); setIoSearchQuery('') }}
        title={`Assign Investigation Officer: ${assignModalCase?.case_number}`}
      >
        {assignModalCase && (
          <div className="space-y-4">
            <div className="p-3 bg-navy-50/70 border border-navy-100 rounded-lg text-xs text-navy-800">
              <p className="font-semibold text-sm mb-0.5">{assignModalCase.title}</p>
              <p className="text-slate-600 line-clamp-2">{assignModalCase.description || 'No description filed.'}</p>
              <p className="mt-1.5 text-slate-500 font-mono text-[11px]">Docket: {assignModalCase.case_number} · Status: {assignModalCase.status}</p>
            </div>

            <div>
              <label className="label">Search Investigation Officers</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={ioSearchQuery}
                  onChange={(e) => setIoSearchQuery(e.target.value)}
                  placeholder="Search by officer name, badge number, or department..."
                  className="input pl-9 text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {investigationOfficers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No Investigation Officers found matching your search.
                </div>
              ) : (
                investigationOfficers.map((io) => (
                  <div key={io.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                    <div>
                      <p className="text-sm font-semibold text-navy-900 flex items-center gap-1.5">
                        <UserCheck size={14} className="text-emerald-600" />
                        {io.username}
                      </p>
                      <p className="text-xs text-slate-500">
                        Badge: {io.badge_number || 'N/A'} · Dept: {io.department || 'Investigation Bureau'}
                      </p>
                    </div>
                    <button
                      disabled={submitting}
                      onClick={() => handleAssignIO(assignModalCase.id, io.id, io.username)}
                      className="btn-primary btn-sm text-xs py-1 px-3"
                    >
                      Assign IO
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => { setAssignModalCase(null); setIoSearchQuery('') }}
                className="btn-outline btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
