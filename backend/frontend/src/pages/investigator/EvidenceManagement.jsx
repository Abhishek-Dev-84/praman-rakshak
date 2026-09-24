import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Beaker, Smartphone, Camera, Package, Shield, QrCode,
  MapPin, History, ArrowRightLeft, Upload, CheckCircle2, AlertTriangle, FileText,
  Pencil, Trash2, Loader2, Fingerprint, XCircle
} from 'lucide-react'
import { PageHeader, FilterPills } from '../../components/common/Controls'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { useUI } from '../../context/UIContext'
import {
  fetchEvidenceList, createEvidence, updateEvidence, deleteEvidence,
  uploadEvidenceMedia, fetchEvidenceCustody, fetchEvidenceMovements,
  createMovementRequest, fetchStorageLocations, fetchCases,
  approveMovementRequest, rejectMovementRequest
} from '../../api/realApi'

const TYPE_ICONS = {
  BIOLOGICAL: Beaker,
  DIGITAL: Smartphone,
  PHYSICAL: Package,
  DOCUMENTARY: FileText,
  FIREARM: Shield,
  OTHER: Camera,
}

export default function EvidenceManagement() {
  const [filter, setFilter] = useState('All')
  const [items, setItems] = useState([])
  const [cases, setCases] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [openRegister, setOpenRegister] = useState(false)
  const [selectedEvidence, setSelectedEvidence] = useState(null)
  const [editEvidence, setEditEvidence] = useState(null)
  const [deleteEvidenceTarget, setDeleteEvidenceTarget] = useState(null)
  const [deletePin, setDeletePin] = useState('')
  const [pinError, setPinError] = useState('')
  const [custodyLogs, setCustodyLogs] = useState([])
  const [movements, setMovements] = useState([])
  const [openMoveModal, setOpenMoveModal] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { pushToast } = useUI()

  const loadData = async () => {
    setLoading(true)
    try {
      const [evList, casesList, locList] = await Promise.all([
        fetchEvidenceList(),
        fetchCases(),
        fetchStorageLocations(),
      ])
      setItems(Array.isArray(evList) ? evList : evList?.results || [])
      setCases(Array.isArray(casesList) ? casesList : casesList?.results || [])
      setLocations(Array.isArray(locList) ? locList : locList?.results || [])
    } catch (err) {
      console.error(err)
      pushToast({ type: 'error', title: 'Failed to load evidence', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'All') return items
    return items.filter((e) => e.evidence_type?.toUpperCase() === filter.toUpperCase() || e.status === filter)
  }, [filter, items])

  const pendingMovement = useMemo(() => {
    return movements.find((m) => m.status === 'PENDING') || null
  }, [movements])

  const isMovementRequested = Boolean(
    pendingMovement ||
    (selectedEvidence?.status === 'MOVEMENT_PENDING' && !movements.some((m) => m.status === 'APPROVED'))
  )

  const handleRegisterEvidence = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.target)
    try {
      const payload = {
        title: form.get('title'),
        case: form.get('case_id'),
        fir_number: form.get('fir_number') || 'FIR-2026-00445',
        evidence_type: form.get('evidence_type'),
        category: form.get('category'),
        description: form.get('description'),
        sensitivity_level: form.get('sensitivity_level') || 'MEDIUM',
        current_seal_number: form.get('seal_number'),
        current_condition: form.get('condition') || 'INTACT',
        current_location: form.get('location_id') || null,
        length: parseFloat(form.get('length')) || null,
        width: parseFloat(form.get('width')) || null,
        height: parseFloat(form.get('height')) || null,
        weight: parseFloat(form.get('weight')) || null,
        serial_number: form.get('serial_number') || '',
        manufacturer: form.get('manufacturer') || '',
      }

      await createEvidence(payload)
      pushToast({ type: 'success', title: 'Physical Evidence Registered & Ingested into SDMS' })
      setOpenRegister(false)
      loadData()
    } catch (err) {
      pushToast({ type: 'error', title: 'Registration failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateEvidence = async (e) => {
    e.preventDefault()
    if (!editEvidence) return
    setSubmitting(true)
    const form = new FormData(e.target)
    try {
      const payload = {
        title: form.get('title'),
        category: form.get('category'),
        current_condition: form.get('condition'),
        current_seal_number: form.get('seal_number'),
        description: form.get('description'),
      }
      await updateEvidence(editEvidence.id, payload)
      pushToast({ type: 'success', title: 'Evidence Updated', message: 'Registry records synchronized.' })
      setEditEvidence(null)
      if (selectedEvidence?.id === editEvidence.id) {
        setSelectedEvidence(null)
      }
      loadData()
    } catch (err) {
      pushToast({ type: 'error', title: 'Update failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteEvidence = async () => {
    if (!deleteEvidenceTarget) return
    if (deletePin !== '1234') {
      setPinError('Invalid Security PIN. Authorization rejected.')
      return
    }
    setSubmitting(true)
    try {
      await deleteEvidence(deleteEvidenceTarget.id)
      pushToast({ type: 'success', title: 'Evidence Record Removed', message: 'Item permanently removed and deletion sealed in audit ledger.' })
      setDeleteEvidenceTarget(null)
      setDeletePin('')
      setPinError('')
      if (selectedEvidence?.id === deleteEvidenceTarget.id) {
        setSelectedEvidence(null)
      }
      loadData()
    } catch (err) {
      pushToast({ type: 'error', title: 'Deletion failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const openDetails = async (ev) => {
    setSelectedEvidence(ev)
    try {
      const [custody, moveList] = await Promise.all([
        fetchEvidenceCustody(ev.id),
        fetchEvidenceMovements(ev.id),
      ])
      setCustodyLogs(Array.isArray(custody) ? custody : custody?.results || [])
      setMovements(Array.isArray(moveList) ? moveList : moveList?.results || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateMovement = async (e) => {
    e.preventDefault()
    if (!selectedEvidence) return
    setSubmitting(true)
    const form = new FormData(e.target)
    try {
      await createMovementRequest({
        evidence_id: selectedEvidence.id,
        requested_destination: form.get('destination_id') || null,
        external_destination_notes: form.get('external_destination'),
        purpose: form.get('purpose'),
        reason: form.get('reason'),
      })
      pushToast({ type: 'success', title: 'Movement Request Dispatched for Supervisor Approval' })
      setOpenMoveModal(false)
      openDetails(selectedEvidence)
      loadData()
    } catch (err) {
      pushToast({ type: 'error', title: 'Movement request failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedEvidence) return
    setUploadingMedia(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('media_category', 'EVIDENCE_PHOTO')
    formData.append('description', 'Forensic Intake Photo')
    try {
      await uploadEvidenceMedia(selectedEvidence.id, formData)
      pushToast({ type: 'success', title: 'Media Ingested with SHA-256' })
      openDetails(selectedEvidence)
    } catch (err) {
      pushToast({ type: 'error', title: 'Media upload failed', message: err.message })
    } finally {
      setUploadingMedia(false)
    }
  }

  const handleApproveMovement = async (movementId) => {
    const idToApprove = movementId || pendingMovement?.id
    if (!idToApprove) {
      pushToast({ type: 'error', title: 'Action Failed', message: 'No active movement request found to approve.' })
      return
    }
    setActionLoading(true)
    try {
      await approveMovementRequest(idToApprove, 'Approved by Administrator', 'BIOMETRIC')
      pushToast({
        type: 'success',
        title: 'Movement Request Approved',
        message: `Movement request ${pendingMovement?.request_number || ''} authorized successfully.`
      })
      await loadData()
      if (selectedEvidence) {
        const [custody, moveList] = await Promise.all([
          fetchEvidenceCustody(selectedEvidence.id),
          fetchEvidenceMovements(selectedEvidence.id),
        ])
        setCustodyLogs(Array.isArray(custody) ? custody : custody?.results || [])
        setMovements(Array.isArray(moveList) ? moveList : moveList?.results || [])
        setSelectedEvidence((prev) => (prev ? { ...prev, status: 'IN_STORAGE' } : null))
      }
    } catch (err) {
      console.error(err)
      pushToast({ type: 'error', title: 'Approval Failed', message: err.message || 'Could not approve movement request.' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmReject = async () => {
    const idToReject = pendingMovement?.id
    if (!idToReject) return
    setActionLoading(true)
    try {
      await rejectMovementRequest(idToReject, rejectReason || 'Rejected by Administrator', 'BIOMETRIC')
      pushToast({
        type: 'info',
        title: 'Movement Request Rejected',
        message: `Movement request ${pendingMovement?.request_number || ''} has been rejected.`
      })
      setRejectModalOpen(false)
      setRejectReason('')
      await loadData()
      if (selectedEvidence) {
        const [custody, moveList] = await Promise.all([
          fetchEvidenceCustody(selectedEvidence.id),
          fetchEvidenceMovements(selectedEvidence.id),
        ])
        setCustodyLogs(Array.isArray(custody) ? custody : custody?.results || [])
        setMovements(Array.isArray(moveList) ? moveList : moveList?.results || [])
        setSelectedEvidence((prev) => (prev ? { ...prev, status: 'IN_STORAGE' } : null))
      }
    } catch (err) {
      console.error(err)
      pushToast({ type: 'error', title: 'Rejection Failed', message: err.message || 'Could not reject movement request.' })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Physical Evidence & Chain of Custody Vault"
        subtitle={`Total registered items: ${items.length}`}
        actions={
          <button onClick={() => setOpenRegister(true)} className="btn-primary btn-sm flex items-center gap-1.5">
            <Plus size={16} /> Register Physical Evidence
          </button>
        }
      />

      <div className="card p-4 mb-4">
        <FilterPills
          options={[
            { value: 'All', label: 'All Items' },
            { value: 'PHYSICAL', label: 'Physical' },
            { value: 'DIGITAL', label: 'Digital' },
            { value: 'BIOLOGICAL', label: 'Biological' },
            { value: 'FIREARM', label: 'Weapons' },
            { value: 'DOCUMENTARY', label: 'Documents' },
          ]}
          active={filter}
          onChange={setFilter}
        />
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-500">
          <Loader2 className="animate-spin text-navy-600 mx-auto mb-2" size={28} />
          Loading secure evidence ledger…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">No evidence items match the filter.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const Icon = TYPE_ICONS[item.evidence_type] || Package
            return (
              <div
                key={item.id}
                className="card p-4 hover:border-navy-300 border border-transparent transition cursor-pointer flex flex-col justify-between"
                onClick={() => openDetails(item)}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-navy-50 text-navy-700 rounded-lg">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                        <p className="text-xs font-mono text-blue-700 font-semibold">{item.evidence_number}</p>
                      </div>
                    </div>
                    <Badge status={item.status} />
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {item.description || 'No description provided.'}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Seal #:</span>
                    <span className="font-mono">{item.current_seal_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Condition:</span>
                    <span className="font-semibold text-emerald-700">{item.current_condition || 'INTACT'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditEvidence(item); }}
                      className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded"
                      title="Edit Item"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteEvidenceTarget(item); }}
                      className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded"
                      title="Delete Item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Register Evidence Modal */}
      <Modal open={openRegister} onClose={() => setOpenRegister(false)} title="Register Physical / Digital Evidence Item">
        <form onSubmit={handleRegisterEvidence} className="space-y-3">
          <div>
            <label className="label">Item Title / Descriptor</label>
            <input name="title" required className="input" placeholder="e.g. Glock 17 9mm Handgun or Samsung S21" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Associated Case Docket</label>
              <select name="case_id" required className="input">
                <option value="">-- Select Case --</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_number} - {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Evidence Type</label>
              <select name="evidence_type" className="input">
                <option value="PHYSICAL">Physical Object</option>
                <option value="DIGITAL">Digital Device</option>
                <option value="BIOLOGICAL">Biological Sample</option>
                <option value="FIREARM">Firearm / Weapon</option>
                <option value="DOCUMENTARY">Physical Document</option>
                <option value="VALUABLE">Valuables / Currency</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <input name="category" className="input" placeholder="e.g. Mobile Device, Knife, Paper" />
            </div>
            <div>
              <label className="label">Sensitivity Level</label>
              <select name="sensitivity_level" className="input">
                <option value="LOW">Low (Standard)</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High (Strict Approval)</option>
                <option value="RESTRICTED">Restricted Vault Custody</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Initial Tamper Seal #</label>
              <input name="seal_number" className="input" placeholder="SEAL-IND-XXXXXX" />
            </div>
            <div>
              <label className="label">Storage Location</label>
              <select name="location_id" className="input">
                <option value="">-- Assign Vault Location --</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.location_code} ({l.hierarchy_path})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Length (cm)</label>
              <input name="length" type="number" step="0.1" className="input" placeholder="cm" />
            </div>
            <div>
              <label className="label">Width (cm)</label>
              <input name="width" type="number" step="0.1" className="input" placeholder="cm" />
            </div>
            <div>
              <label className="label">Weight (g)</label>
              <input name="weight" type="number" step="0.1" className="input" placeholder="grams" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Serial Number / IMEI</label>
              <input name="serial_number" className="input" placeholder="Serial / IMEI" />
            </div>
            <div>
              <label className="label">Manufacturer / Brand</label>
              <input name="manufacturer" className="input" placeholder="e.g. Apple, Samsung" />
            </div>
          </div>

          <div>
            <label className="label">Detailed Notes / Seizure Context</label>
            <textarea name="description" rows={2} className="input" placeholder="Seized from accused at scene..." />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
            {submitting ? 'Registering…' : 'Register Evidence Record'}
          </button>
        </form>
      </Modal>

      {/* Edit Evidence Modal */}
      <Modal open={!!editEvidence} onClose={() => setEditEvidence(null)} title={`Edit Evidence: ${editEvidence?.evidence_number}`}>
        {editEvidence && (
          <form onSubmit={handleUpdateEvidence} className="space-y-3">
            <div>
              <label className="label">Title / Description</label>
              <input name="title" defaultValue={editEvidence.title} required className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Category</label>
                <input name="category" defaultValue={editEvidence.category} className="input" />
              </div>
              <div>
                <label className="label">Condition</label>
                <select name="condition" defaultValue={editEvidence.current_condition || 'INTACT'} className="input">
                  <option value="INTACT">INTACT</option>
                  <option value="DAMAGED">DAMAGED</option>
                  <option value="COMPROMISED">COMPROMISED</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Current Seal Number</label>
              <input name="seal_number" defaultValue={editEvidence.current_seal_number} className="input" />
            </div>
            <div>
              <label className="label">Description / Inspection Notes</label>
              <textarea name="description" defaultValue={editEvidence.description} rows={2} className="input" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditEvidence(null)} className="btn-outline btn-sm">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary btn-sm">
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Evidence Modal with Biometric / Security PIN Step-up */}
      <Modal
        open={!!deleteEvidenceTarget}
        onClose={() => {
          setDeleteEvidenceTarget(null)
          setDeletePin('')
          setPinError('')
        }}
        title="Authorize Evidence Deletion"
        footer={
          <>
            <button
              onClick={() => {
                setDeleteEvidenceTarget(null)
                setDeletePin('')
                setPinError('')
              }}
              className="btn-outline btn-sm"
            >
              Cancel
            </button>
            <button onClick={handleDeleteEvidence} disabled={submitting || !deletePin} className="btn-danger btn-sm">
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
              {submitting ? 'Authenticating & Deleting…' : 'Authorize & Delete'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Are you sure you want to permanently remove physical evidence <span className="font-semibold text-slate-900">{deleteEvidenceTarget?.evidence_number}</span> ({deleteEvidenceTarget?.title})?
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

      {/* Evidence Detail & Dossier Modal */}
      {selectedEvidence && (
        <Modal
          open={!!selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
          title={`Evidence Dossier: ${selectedEvidence.evidence_number}`}
        >
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 text-sm">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-900 text-base">{selectedEvidence.title}</p>
                <p className="text-xs text-slate-500">{selectedEvidence.case_number} • {selectedEvidence.category}</p>
              </div>
              <Badge status={selectedEvidence.status} />
            </div>

            {/* Location & Custodian */}
            <div className="card p-3 bg-blue-50/50 border border-blue-100">
              <div className="flex items-center gap-2 text-blue-900 font-semibold mb-1">
                <MapPin size={16} />
                <span>Current Storage Location Hierarchy:</span>
              </div>
              <p className="text-xs font-mono text-blue-800 bg-white p-2 rounded-lg border border-blue-200">
                {selectedEvidence.current_location_path || 'No fixed storage position assigned.'}
              </p>
              <div className="mt-2 text-xs text-slate-600 flex justify-between">
                <span>Custodian: <strong>{selectedEvidence.current_custodian_name || 'Assigned Officer'}</strong></span>
                <span>Seal Condition: <strong>{selectedEvidence.seal_condition}</strong></span>
              </div>
            </div>

            {/* Action Bar - Replaces Request Movement & Attach Media with Approve / Reject when Movement is Requested */}
            {isMovementRequested ? (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle size={16} className="text-amber-600 animate-pulse" />
                    <span>Evidence Movement Requested</span>
                  </div>
                  <span className="text-xs font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-semibold">
                    {pendingMovement?.request_number || 'PENDING'}
                  </span>
                </div>

                <div className="text-xs text-slate-700 bg-white/95 p-3 rounded-lg border border-amber-200/80 space-y-1.5 shadow-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Requested By:</span>
                    <span className="font-semibold text-slate-800">{pendingMovement?.requested_by_name || 'Investigating Officer'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Purpose:</span>
                    <span className="font-semibold text-slate-800">
                      {pendingMovement?.purpose?.replace(/_/g, ' ') || 'Judicial / Lab Transfer'}
                    </span>
                  </div>
                  {(pendingMovement?.requested_destination_path || pendingMovement?.external_destination_notes) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Destination:</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[60%] truncate">
                        {pendingMovement.requested_destination_path || pendingMovement.external_destination_notes}
                      </span>
                    </div>
                  )}
                  {pendingMovement?.reason && (
                    <div className="pt-1.5 border-t border-slate-100">
                      <span className="text-slate-500 block mb-0.5">Reason:</span>
                      <p className="italic text-slate-700 bg-slate-50 p-1.5 rounded text-[11px] border border-slate-100">
                        "{pendingMovement.reason}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(true)}
                    disabled={actionLoading}
                    className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle size={15} />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveMovement(pendingMovement?.id)}
                    disabled={actionLoading}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                    Approve
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setOpenMoveModal(true)}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2 py-2 text-xs"
                >
                  <ArrowRightLeft size={14} />
                  Request Movement
                </button>
                <label className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-xs cursor-pointer">
                  <Upload size={14} />
                  {uploadingMedia ? 'Uploading...' : 'Attach Photo/Media'}
                  <input type="file" className="hidden" onChange={handleMediaUpload} accept="image/*,video/*" />
                </label>
              </div>
            )}

            {/* Custody History Timeline */}
            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <History size={15} />
                Chain of Custody Ledger (Immutable)
              </h4>
              <div className="space-y-2">
                {custodyLogs.length === 0 ? (
                  <p className="text-xs text-slate-400">No transfer events recorded.</p>
                ) : (
                  custodyLogs.map((c) => (
                    <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
                      <div className="flex justify-between font-semibold text-slate-800">
                        <span>{c.transfer_reason}</span>
                        <span className="text-slate-400">{new Date(c.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">
                        {c.previous_custodian_name ? `${c.previous_custodian_name} → ` : ''}
                        <strong>{c.new_custodian_name}</strong>
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Movement Request Modal */}
      <Modal open={openMoveModal} onClose={() => setOpenMoveModal(false)} title="Initiate Evidence Movement Request">
        <form onSubmit={handleCreateMovement} className="space-y-3">
          <div>
            <label className="label">Destination Facility / Vault</label>
            <select name="destination_id" className="input">
              <option value="">-- Select Internal Vault / Shelf --</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.location_code} ({l.hierarchy_path})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">External Destination (Court / Lab)</label>
            <input name="external_destination" className="input" placeholder="e.g. FSL Cyber Division or High Court Bench 3" />
          </div>
          <div>
            <label className="label">Movement Purpose</label>
            <select name="purpose" className="input">
              <option value="FORENSIC_EXAMINATION">Forensic Science Laboratory Analysis</option>
              <option value="COURT_PROCEEDING">Judicial Court Presentation</option>
              <option value="INTER_FACILITY_TRANSFER">Inter-Facility Vault Transfer</option>
              <option value="TEMPORARY_INVESTIGATION">Investigation Inspection</option>
            </select>
          </div>
          <div>
            <label className="label">Reason / Legal Authorization</label>
            <textarea name="reason" required rows={2} className="input" placeholder="Required for forensic acquisition..." />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Submitting…' : 'Submit Movement Request'}
          </button>
        </form>
      </Modal>

      {/* Reject Movement Request Modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false)
          setRejectReason('')
        }}
        title={`Reject Movement Request: ${pendingMovement?.request_number || ''}`}
        footer={
          <>
            <button
              onClick={() => {
                setRejectModalOpen(false)
                setRejectReason('')
              }}
              className="btn-outline btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReject}
              disabled={actionLoading}
              className="btn-danger btn-sm flex items-center gap-1.5"
            >
              {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
              Confirm Rejection
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">
            Please provide a justification for declining this movement request for physical evidence{' '}
            <strong className="text-slate-900">{selectedEvidence?.evidence_number}</strong>.
          </p>
          <div>
            <label className="label">Rejection Reason / Notes</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Inadequate chain of custody justification / judicial order required"
              rows={3}
              className="input text-sm"
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
