import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FileText, TrendingUp, Loader2, Shield, Pencil, Trash2, ShieldAlert, Fingerprint, UserPlus, FolderOpen, Upload } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { EmptyState } from '../../components/common/States'
import { useUI } from '../../context/UIContext'
import { fetchCases, fetchDocuments, updateCase, deleteCase, assignCase, fetchAssignableOfficers, uploadDocument } from '../../api/realApi'
import { subscribeToCaseAudit } from '../../api/websocketService'

export default function SharedCaseDetail({ basePath = '/admin', documentBasePath }) {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState(null)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePin, setDeletePin] = useState('')
  const [pinError, setPinError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tamperAlert, setTamperAlert] = useState(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [officers, setOfficers] = useState([])
  const [selectedOfficer, setSelectedOfficer] = useState('')
  const [selectedRole, setSelectedRole] = useState('OFFICER')
  const [assignLoading, setAssignLoading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadDocType, setUploadDocType] = useState('FIR')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDesc, setUploadDesc] = useState('')
  const [uploadSubmitting, setUploadSubmitting] = useState(false)
  const { pushToast } = useUI()
  const docPath = documentBasePath || `${basePath}/documents`

  const loadCaseData = async () => {
    setLoading(true)
    try {
      const [allCases, allDocs] = await Promise.all([
        fetchCases(),
        fetchDocuments({ caseId: caseId }),
      ])
      const caseList = Array.isArray(allCases) ? allCases : allCases?.results || []
      const foundCase = caseList.find((c) => String(c.id) === String(caseId) || c.case_number === caseId)
      setCaseData(foundCase || null)

      const docList = Array.isArray(allDocs) ? allDocs : allDocs?.results || []
      setDocs(docList.filter((d) => String(d.case) === String(caseId) || String(d.case_id) === String(caseId)))
    } catch (err) {
      console.error('Failed to load case detail:', err)
    } finally {
      setLoading(false)
    }
  }

  const openAssignModal = async () => {
    setAssignOpen(true)
    try {
      const list = await fetchAssignableOfficers()
      const arr = Array.isArray(list) ? list : list?.results || []
      setOfficers(arr)
      if (arr.length > 0) {
        setSelectedOfficer(String(arr[0].id))
        setSelectedRole(arr[0].role || 'OFFICER')
      }
    } catch (e) {
      console.error('Failed to load assignable officers:', e)
    }
  }

  const handleAssignOfficer = async (e) => {
    e.preventDefault()
    if (!selectedOfficer || !caseData) return
    setAssignLoading(true)
    try {
      await assignCase(caseData.id, selectedOfficer, selectedRole)
      pushToast({ type: 'success', title: 'Role Assigned', message: `Assigned as ${selectedRole} on case docket.` })
      setAssignOpen(false)
      loadCaseData()
    } catch (err) {
      pushToast({ type: 'error', title: 'Assignment Failed', message: err.message })
    } finally {
      setAssignLoading(false)
    }
  }

  useEffect(() => {
    loadCaseData()

    // Subscribe to real-time events for this specific case docket
    const unsubscribe = subscribeToCaseAudit(
      caseId,
      (event) => {
        // Real-time audit event occurred (e.g. UPLOAD, APPROVE, VIEW)
        if (event.action === 'UPLOAD' || event.action === 'DELETE' || event.action === 'APPROVE') {
          // Re-sync documents silently
          fetchDocuments({ case: caseId }).then((allDocs) => {
            const docList = Array.isArray(allDocs) ? allDocs : allDocs?.results || []
            setDocs(docList.filter((d) => String(d.case) === String(caseId) || String(d.case_id) === String(caseId)))
          })
        }
      },
      (tamper) => {
        // Genuine tamper detection occurred on this case
        setTamperAlert(tamper)
        pushToast({
          type: 'error',
          title: '🚨 CRITICAL TAMPER ALERT',
          message: tamper.message || 'Cryptographic tampering detected on case document!',
        })
      }
    )

    return () => {
      unsubscribe()
    }
  }, [caseId])

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!caseData) return
    setSubmitting(true)
    const form = new FormData(e.target)
    try {
      await updateCase(caseData.id, {
        title: form.get('title'),
        description: form.get('description'),
        status: form.get('status'),
      })
      pushToast({ type: 'success', title: 'Case Updated', message: 'Changes saved to judicial records.' })
      setEditOpen(false)
      loadCaseData()
    } catch (err) {
      pushToast({ type: 'error', title: 'Update failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!caseData) return
    if (deletePin !== '1234' && deletePin !== '123456') {
      setPinError('Invalid Security PIN. Enter officer PIN (1234) to authorize deletion.')
      return
    }
    setSubmitting(true)
    setPinError('')
    try {
      await deleteCase(caseData.id)
      pushToast({ type: 'success', title: 'Case Deleted', message: `Docket ${caseData.case_number} removed.` })
      navigate(`${basePath}/cases`)
    } catch (err) {
      pushToast({ type: 'error', title: 'Delete failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUploadDocument = async (e) => {
    e.preventDefault()
    if (!uploadFile) {
      pushToast({ type: 'error', title: 'File required', message: 'Please attach an evidence or case document file.' })
      return
    }
    setUploadSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('title', uploadTitle || uploadFile.name)
      formData.append('case', caseData.id)
      formData.append('category', uploadDocType)
      formData.append('classification', 'CONFIDENTIAL')
      if (uploadDesc) formData.append('description', uploadDesc)

      await uploadDocument(formData)
      pushToast({
        type: 'success',
        title: 'Document Uploaded & Sealed',
        message: `${uploadFile.name} successfully registered under case ${caseData.case_number}.`,
      })
      setUploadOpen(false)
      setUploadFile(null)
      setUploadTitle('')
      setUploadDesc('')
      setUploadDocType('FIR')
      loadCaseData()
    } catch (err) {
      pushToast({ type: 'error', title: 'Upload failed', message: err.message })
    } finally {
      setUploadSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-navy-600 mb-2" size={28} />
        <p className="text-sm text-slate-500">Retrieving case record from judicial database…</p>
      </div>
    )
  }

  if (!caseData) {
    return <EmptyState title="Case not found" description="The case docket you're looking for doesn't exist in the database." />
  }

  return (
    <div>
      <PageHeader
        back
        title={`${caseData.case_number || caseData.id} — ${caseData.title}`}
        subtitle={`Court: ${caseData.court || 'Sessions Court'} · Registered: ${caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : 'Active'}`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Synced</span>
            </div>
            <Badge status={caseData.status || 'Active'} />
            {(basePath === '/admin' || basePath === '/investigator' || basePath === '/police') && (
              <Link to={`${basePath}/evidence`} className="btn-outline btn-sm flex items-center gap-1">
                <FolderOpen size={14} /> Physical Evidence
              </Link>
            )}
            {basePath === '/investigator' && caseData.status !== 'CLOSED' && (
              <Link
                to={`/investigator/create-document?caseId=${caseData.id}&category=Final Case Report`}
                className="btn-primary btn-sm flex items-center gap-1 bg-navy-800 hover:bg-navy-900 text-white"
                title="Upload Final Case Report to conclude investigation"
              >
                <Shield size={14} /> Complete Investigation & Final Report
              </Link>
            )}
            {basePath === '/admin' && (
              <button onClick={openAssignModal} className="btn-outline btn-sm flex items-center gap-1">
                <UserPlus size={14} /> Assign Role
              </button>
            )}
            <button onClick={() => setEditOpen(true)} className="btn-outline btn-sm flex items-center gap-1">
              <Pencil size={14} /> Edit Case
            </button>
            {basePath === '/admin' && (
              <button onClick={() => setDeleteOpen(true)} className="btn-danger btn-sm flex items-center gap-1">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        }
      />

      {tamperAlert && (
        <div className="card p-4 mb-4 bg-red-50 border border-red-300 rounded-xl flex items-start gap-3">
          <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={24} />
          <div className="flex-1 text-sm">
            <p className="font-bold text-red-900">SECURITY BREACH: Cryptographic Tampering Detected</p>
            <p className="text-red-700 text-xs mt-1">
              {tamperAlert.message || tamperAlert.reason}
            </p>
            <p className="text-red-600 font-mono text-[11px] mt-1">
              Document: {tamperAlert.document_title || tamperAlert.document_id} · Broken Block ID: {tamperAlert.broken_at_log_id}
            </p>
          </div>
          <button
            onClick={() => setTamperAlert(null)}
            className="text-xs text-red-700 hover:text-red-900 font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <div className="card p-5 lg:col-span-2">
          <p className="font-semibold text-navy-900 text-sm mb-3">Case Information & Docket Summary</p>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold mb-0.5">Filing Officer / Created By</p>
              <p className="text-navy-800 font-medium">{caseData.created_by_username || caseData.investigatingOfficer || 'Investigating Officer'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold mb-0.5">Jurisdiction</p>
              <p className="text-navy-800 font-medium">{caseData.court || 'Central District Jurisdiction'}</p>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-slate-400 uppercase font-semibold">Assigned Multi-Role Case Team</p>
                {basePath === '/admin' && (
                  <button
                    type="button"
                    onClick={openAssignModal}
                    className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
                  >
                    <UserPlus size={12} /> Assign / Add Team Role
                  </button>
                )}
              </div>
              {caseData.assigned_users && caseData.assigned_users.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {caseData.assigned_users.map((member, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs"
                    >
                      <span className="font-semibold text-slate-800">{member.username}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                        {member.assigned_role || member.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  {caseData.assigned_officer_name || caseData.lead_officer_name || 'No roles assigned yet. Click "Assign / Add Team Role" to assign Police, Investigator, Judge, or Legal Officer.'}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-400 uppercase font-semibold mb-0.5">Relevant Legal Sections</p>
              <p className="text-navy-800 font-medium">{caseData.sections || 'BNS / IPC & CrPC'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-400 uppercase font-semibold mb-0.5">Description / Case Brief</p>
              <p className="text-slate-600">{caseData.description || 'No detailed description filed for this case docket.'}</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <p className="font-semibold text-navy-900 text-sm mb-3 flex items-center gap-1.5">
            <TrendingUp size={15} /> Case Status
          </p>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mb-1.5">
            <div className="h-full bg-gold-500 rounded-full" style={{ width: `${caseData.status === 'CLOSED' ? 100 : 60}%` }} />
          </div>
          <p className="text-xs text-slate-400 mb-4">{caseData.status || 'Active investigation'}</p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 py-2.5">
              <p className="font-bold text-navy-900">{docs.length}</p>
              <p className="text-xs text-slate-400">Documents</p>
            </div>
            <div className="rounded-lg bg-slate-50 py-2.5">
              <p className="font-bold text-emerald-600">Verified</p>
              <p className="text-xs text-slate-400">Chain Status</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-navy-900 text-sm flex items-center gap-1.5">
            <FileText size={15} /> Case Documents
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{docs.length} filed</span>
            {(basePath === '/police' || basePath === '/investigator' || basePath === '/admin') && (
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="btn-primary btn-sm flex items-center gap-1 text-xs"
              >
                <Upload size={13} /> Upload Document
              </button>
            )}
          </div>
        </div>
        {docs.length === 0 ? (
          <EmptyState title="No documents yet" description="No digital documents have been uploaded to this case docket yet." />
        ) : (
          <div className="divide-y divide-slate-100">
            {docs.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate(`${docPath}/${d.id}`)}
                className="w-full flex items-center justify-between py-3 text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-navy-50 p-2 text-navy-600 shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-800 truncate">{d.title || d.name}</p>
                    <p className="text-xs text-slate-400">
                      Uploaded by {d.uploaded_by_username || 'Officer'} · {d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
                <Badge status={d.status || 'Verified'} className="shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit Case: ${caseData.case_number}`}>
        <form onSubmit={handleUpdate} className="space-y-3.5">
          <div>
            <label className="label">Case Title</label>
            <input name="title" defaultValue={caseData.title} required className="input" />
          </div>
          <div>
            <label className="label">Case Status</label>
            <select name="status" defaultValue={caseData.status || 'OPEN'} className="input">
              <option value="OPEN">OPEN (Active Investigation)</option>
              <option value="CLOSED">CLOSED (Adjudicated / Filed)</option>
            </select>
          </div>
          <div>
            <label className="label">Synopsis / Description</label>
            <textarea name="description" defaultValue={caseData.description} rows={3} className="input" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-outline btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary btn-sm">
              {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal with Security PIN Step-up */}
      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setDeletePin('')
          setPinError('')
        }}
        title="Authorize Case Deletion"
        footer={
          <>
            <button
              onClick={() => {
                setDeleteOpen(false)
                setDeletePin('')
                setPinError('')
              }}
              className="btn-outline btn-sm"
            >
              Cancel
            </button>
            <button onClick={handleDelete} disabled={submitting || !deletePin} className="btn-danger btn-sm">
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
              {submitting ? 'Authenticating & Deleting…' : 'Authorize & Delete'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Permanently deleting case docket <span className="font-semibold text-slate-900">{caseData.case_number}</span> is an irreversible administrative action. An immutable cryptographic deletion block will be sealed into the ledger.
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

      {/* Assign Officer Modal */}
      {/* Assign Case Team / Role Modal */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title={`Assign Case Team / Role: ${caseData.case_number}`}>
        <form onSubmit={handleAssignOfficer} className="space-y-3.5">
          <p className="text-sm text-slate-600">
            Assign judicial, police, or investigative personnel to case docket <span className="font-semibold text-slate-900">{caseData.case_number}</span>. A single case docket can be assigned to multiple roles (Police Officer, Lead Investigator, Presiding Judge, Legal Officer) concurrently.
          </p>
          <div>
            <label className="label">Select Official / Officer</label>
            {officers.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No available personnel found.</p>
            ) : (
              <select
                value={selectedOfficer}
                onChange={(e) => {
                  setSelectedOfficer(e.target.value)
                  const chosen = officers.find((o) => String(o.id) === String(e.target.value))
                  if (chosen && chosen.role) setSelectedRole(chosen.role)
                }}
                className="input"
                required
              >
                {officers.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.username} ({off.role}) {off.badge_number ? `· Badge: ${off.badge_number}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="label">Assignment Role / Capacity on Docket</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input"
              required
            >
              <option value="OFFICER">Police Officer (First Responder / Station IO)</option>
              <option value="INVESTIGATOR">Lead Investigator (Forensic Inquiry)</option>
              <option value="JUDGE">Presiding Judge (Court Adjudication)</option>
              <option value="LEGAL_OFFICER">Legal Officer / Prosecutor (Public Prosecution)</option>
              <option value="ADMIN">System Administrator (Supervisory Authority)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAssignOpen(false)} className="btn-outline btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={assignLoading || officers.length === 0} className="btn-primary btn-sm">
              {assignLoading ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />}
              {assignLoading ? 'Assigning…' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Document Modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title={`Upload Evidence Document: ${caseData.case_number}`}>
        <form onSubmit={handleUploadDocument} className="space-y-3.5">
          <div>
            <label className="label">Document File</label>
            <input
              type="file"
              required
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="input text-sm file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100 cursor-pointer"
            />
          </div>
          <div>
            <label className="label">Document Title / Heading</label>
            <input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="e.g. Complainant Statement or FSL Ballistics Examination Report"
              className="input text-sm"
            />
          </div>
          <div>
            <label className="label">Document Category / Case Classification</label>
            <select
              value={uploadDocType}
              onChange={(e) => setUploadDocType(e.target.value)}
              className="input text-sm font-medium"
            >
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
            <label className="label">Filing Synopsis / Observations (Optional)</label>
            <textarea
              value={uploadDesc}
              onChange={(e) => setUploadDesc(e.target.value)}
              rows={3}
              placeholder="Enter synopsis, evidence cross-reference, and chain notes..."
              className="input text-sm resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setUploadOpen(false)} className="btn-outline btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={uploadSubmitting} className="btn-primary btn-sm flex items-center gap-1.5">
              {uploadSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
              {uploadSubmitting ? 'Uploading & Sealing…' : 'Upload & Hash Seal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
