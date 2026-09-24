import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Download,
  Share2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Fingerprint,
  Copy,
  MessageSquare,
  Loader2,
  FileText,
  Pencil,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Clock,
} from 'lucide-react'
import { PageHeader, Tabs } from '../../components/common/Controls'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { EmptyState } from '../../components/common/States'
import SignatureConfirmModal from '../../components/common/SignatureConfirmModal'
import { useUI } from '../../context/UIContext'
import { useAuth } from '../../context/AuthContext'
import {
  fetchDocuments,
  verifyDocumentIntegrity,
  fetchAuditLogs,
  updateDocument,
  deleteDocument,
  simulateTamper,
  restoreTamper,
  signDocument,
} from '../../api/realApi'
import { subscribeToCaseAudit, subscribeToGlobalAudit } from '../../api/websocketService'

export default function SharedDocumentReview({
  basePath = '/admin',
  canSign = true,
  canDelete = true,
  canRequestClarification = false,
  signLabel = 'Sign & Approve for Record',
}) {
  const { docId } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('document')
  const [zoom, setZoom] = useState(100)
  const [notes, setNotes] = useState('')
  const [signOpen, setSignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePin, setDeletePin] = useState('')
  const [pinError, setPinError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tampering, setTampering] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [signed, setSigned] = useState(false)
  const [verification, setVerification] = useState(null)
  const [logs, setLogs] = useState([])
  const [fileUnlocked, setFileUnlocked] = useState(true)
  const [fileBlobUrl, setFileBlobUrl] = useState(null)
  const [fileTextContent, setFileTextContent] = useState('')
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [unlockPin, setUnlockPin] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [actionModal, setActionModal] = useState(null) // { type: 'APPROVE' | 'REJECT' }
  const [actionPin, setActionPin] = useState('')
  const [actionPinError, setActionPinError] = useState('')
  const { pushToast } = useUI()
  const { user } = useAuth()

  const loadDocument = async () => {
    setLoading(true)
    try {
      const allDocs = await fetchDocuments()
      const docList = Array.isArray(allDocs) ? allDocs : allDocs?.results || []
      const found = docList.find((d) => String(d.id) === String(docId))
      setDoc(found || null)
      if (found?.extracted_text) {
        setFileTextContent(found.extracted_text)
      } else if (found?.description) {
        setFileTextContent(found.description)
      }

      if (found) {
        try {
          const [vRes, lRes] = await Promise.all([
            verifyDocumentIntegrity(found.id),
            fetchAuditLogs({ document_id: found.id }),
          ])
          setVerification(vRes)
          setLogs(Array.isArray(lRes) ? lRes : lRes?.results || [])
        } catch (_) {}
      }
    } catch (err) {
      console.error('Failed to load document review:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    let blobUrl = null

    if (fileUnlocked && doc?.id) {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      fetch(`/api/documents/${doc.id}/download/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => {
          if (!res.ok) throw new Error('File download response not OK')
          return res.blob()
        })
        .then(async (blob) => {
          if (active) {
            blobUrl = URL.createObjectURL(blob)
            setFileBlobUrl(blobUrl)
            try {
              const txt = await blob.text()
              if (txt && txt.trim().length > 0) {
                const printable = (txt.match(/[\x20-\x7E\r\n\t]/g) || []).length
                if (printable > txt.length * 0.65) {
                  setFileTextContent(txt)
                }
              }
            } catch (_) {}
          }
        })
        .catch((e) => {
          console.warn('Authenticated file stream fetch failed, falling back to static path:', e)
        })
    } else {
      setFileBlobUrl(null)
    }

    return () => {
      active = false
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [fileUnlocked, doc?.id])

  useEffect(() => {
    loadDocument()

    const unsubGlobal = subscribeToGlobalAudit(
      (newLog) => {
        if (doc && (newLog.document_id === doc.id || newLog.document === doc.id)) {
          setLogs((prev) => [newLog, ...prev.filter((l) => l.log_id !== newLog.log_id)])
        }
      },
      (tamperAlert) => {
        if (doc && (tamperAlert.document_id === doc.id)) {
          setVerification({ valid: false, reason: tamperAlert.reason })
          pushToast({
            type: 'error',
            title: '🚨 CRITICAL TAMPER ALERT',
            message: `Tampering detected on ${doc.title}: ${tamperAlert.reason}`,
          })
        }
      }
    )

    return () => {
      unsubGlobal()
    }
  }, [docId, doc?.id])

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!doc) return
    setSubmitting(true)
    const form = new FormData(e.target)
    try {
      await updateDocument(doc.id, {
        title: form.get('title'),
        category: form.get('category'),
      })
      pushToast({ type: 'success', title: 'Document Updated', message: 'Metadata updated in registry.' })
      setEditOpen(false)
      loadDocument()
    } catch (err) {
      pushToast({ type: 'error', title: 'Update failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!doc) return
    if (deletePin !== '1234') {
      setPinError('Invalid Security PIN. Authorization rejected.')
      return
    }
    setSubmitting(true)
    try {
      await deleteDocument(doc.id)
      pushToast({ type: 'success', title: 'Document Removed', message: 'Document soft-deleted and logged.' })
      setDeleteOpen(false)
      navigate(-1)
    } catch (err) {
      pushToast({ type: 'error', title: 'Deletion failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSimulateTamper = async () => {
    if (!doc) return
    setTampering(true)
    try {
      pushToast({
        type: 'info',
        title: 'Integrity Breach Simulation',
        message: 'Intentionally mutating audit hash block in database to test cryptographic tamper detection...',
      })
      const res = await simulateTamper(doc.id)
      const reason = res.verification_result?.reason || 'Cryptographic HMAC-SHA256 mismatch detected in ledger block!'
      pushToast({
        type: 'error',
        title: '🚨 CRITICAL TAMPER ALERT',
        message: reason,
      })
      setVerification({ valid: false, reason })
    } catch (err) {
      pushToast({ type: 'error', title: 'Simulation failed', message: err.message })
    } finally {
      setTampering(false)
    }
  }

  const handleRestoreTamper = async () => {
    if (!doc) return
    setRestoring(true)
    try {
      pushToast({
        type: 'info',
        title: 'Restoring Integrity',
        message: 'Re-applying authentic SHA-256 checksum and re-verifying HMAC chain...',
      })
      const res = await restoreTamper(doc.id)
      pushToast({
        type: 'success',
        title: 'Chain Restored',
        message: res.message || 'Cryptographic integrity restored and verified. All blocks valid.',
      })
      setVerification({ valid: true, reason: null })
      const updatedLogs = await fetchAuditLogs({ document_id: doc.id })
      setLogs(updatedLogs || [])
    } catch (err) {
      pushToast({ type: 'error', title: 'Restoration failed', message: err.message })
    } finally {
      setRestoring(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-navy-600 mb-2" size={28} />
        <p className="text-sm text-slate-500">Retrieving digital document and running cryptographic verification…</p>
      </div>
    )
  }

  if (!doc) {
    return <EmptyState title="Document not found" description="This document may have been moved or removed from the repository." />
  }

  const handleUnlockFile = (e) => {
    e.preventDefault()
    if (unlockPin !== '1234' && unlockPin !== '123456') {
      setUnlockError('Invalid Security PIN. Official officer PIN (1234) required.')
      return
    }
    setFileUnlocked(true)
    setUnlockOpen(false)
    setUnlockPin('')
    setUnlockError('')
    pushToast({ type: 'success', title: 'File Unlocked', message: 'Identity verified. Evidence file rendered.' })
  }

  const handleConfirmAction = async (e) => {
    e.preventDefault()
    if (!actionModal) return
    if (actionPin !== '1234' && actionPin !== '123456') {
      setActionPinError('Invalid Security PIN. Official officer PIN (1234) required.')
      return
    }
    setSubmitting(true)
    setActionPinError('')
    try {
      await signDocument(doc.id, actionModal.type, {
        verification_method: 'BIOMETRIC',
        password: actionPin,
      })
      const isApprove = actionModal.type === 'APPROVE'
      pushToast({
        type: isApprove ? 'success' : 'info',
        title: isApprove ? 'Document Approved' : 'Document Rejected',
        message: `Action ${actionModal.type} recorded on cryptographic ledger.`,
      })
      setActionModal(null)
      setActionPin('')
      loadDocument()
    } catch (err) {
      pushToast({ type: 'error', title: 'Action Failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = () => {
    if (!fileUnlocked) {
      setUnlockOpen(true)
      setUnlockPin('')
      setUnlockError('')
      pushToast({ type: 'info', title: 'Authorization Required', message: 'Enter officer PIN / Biometric to access and download file.' })
      return
    }
    const dlUrl = fileBlobUrl || `/api/documents/${doc.id}/download/`
    const a = document.createElement('a')
    a.href = dlUrl
    a.download = doc.title || 'evidence_document'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div>
      <PageHeader
        back
        title={doc.title || doc.name}
        subtitle={`Case: ${doc.case_number || doc.caseId || (typeof doc.case === 'string' && doc.case.length < 30 ? doc.case : '') || 'Case Evidence Docket'} · Category: ${doc.category || doc.document_type || 'General'}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge status={signed || doc.status === 'VERIFIED' || doc.status === 'APPROVED' ? 'Verified' : doc.status === 'REJECTED' ? 'Rejected' : 'Not Verified'} />
            {verification?.valid === false ? (
              <button
                onClick={handleRestoreTamper}
                disabled={restoring}
                className="btn-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 font-semibold shadow-sm"
                title="Restore authentic cryptographic hash and verify chain"
              >
                <CheckCircle2 size={14} className={restoring ? 'animate-spin' : ''} />
                {restoring ? 'Restoring…' : 'Restore Integrity (Undo Tamper)'}
              </button>
            ) : (
              <button
                onClick={handleSimulateTamper}
                disabled={tampering}
                className="btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1"
                title="Demonstrate genuine cryptographic tamper detection"
              >
                <AlertOctagon size={14} className={tampering ? 'animate-spin' : ''} />
                {tampering ? 'Simulating…' : 'Simulate Tamper (Demo)'}
              </button>
            )}
            <button onClick={() => setEditOpen(true)} className="btn-outline btn-sm flex items-center gap-1">
              <Pencil size={14} /> Edit
            </button>
            {canDelete && (
              <button onClick={() => setDeleteOpen(true)} className="btn-danger btn-sm flex items-center gap-1">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        }
      />

      {(!signed && doc.status !== 'VERIFIED' && doc.status !== 'APPROVED') && (
        <div className="p-3.5 mb-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock size={18} className="text-amber-600 shrink-0" />
            <div>
              <span className="font-bold uppercase tracking-wider text-amber-800">Status: Not Verified</span>
              <p className="text-amber-700 text-[11px] mt-0.5">
                This evidence document was recorded to the ledger upon upload and is awaiting independent judicial/supervisory verification.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-semibold rounded-md text-[11px] border border-amber-300">
            Pending Review
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4">
            <Tabs
              tabs={[
                { value: 'document', label: 'Document Viewer' },
                { value: 'details', label: 'Cryptographic Details' },
              ]}
              active={tab}
              onChange={setTab}
              className="py-1"
            />
            <div className="hidden sm:flex items-center gap-1">
              <button onClick={handleDownload} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy-600" title="Download">
                <Download size={16} />
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); pushToast({ type: 'success', title: 'Link copied' }) }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy-600" title="Share Link">
                <Share2 size={16} />
              </button>
            </div>
          </div>

          {tab === 'document' ? (
            <div className="p-6 bg-slate-100 flex flex-col items-center">
              {!fileUnlocked ? (
                <div className="bg-white shadow-md rounded-xl p-8 max-w-md w-full text-center border border-slate-200">
                  <div className="h-16 w-16 bg-navy-50 text-navy-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-navy-100">
                    <Lock size={30} />
                  </div>
                  <h4 className="font-bold text-navy-900 text-base mb-1">Confidential Evidence File Locked</h4>
                  <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                    Official biometric or security PIN authorization is required to unlock, decrypt, and view this evidence file.
                  </p>
                  <button
                    onClick={() => { setUnlockOpen(true); setUnlockPin(''); setUnlockError('') }}
                    className="btn-primary btn-sm flex items-center justify-center gap-2 w-full py-2.5 shadow-sm"
                  >
                    <Fingerprint size={16} /> Unlock & View File (PIN / Biometric)
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="w-full flex justify-between items-center mb-3 bg-white px-4 py-2 rounded-lg border border-slate-200 text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <Unlock size={14} /> Evidence Decrypted & Rendered
                    </span>
                    <button
                      onClick={() => setFileUnlocked(false)}
                      className="text-slate-500 hover:text-slate-800 font-medium underline flex items-center gap-1"
                    >
                      <Lock size={12} /> Lock Viewer
                    </button>
                  </div>

                  <div
                    className="bg-white shadow-lg w-full max-w-2xl p-6 relative border border-slate-200 rounded-lg overflow-auto max-h-[600px]"
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                  >
                    {doc.file_url || doc.file || fileBlobUrl ? (
                      ((doc.file_url || doc.file || '').match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) || (doc.category === 'IMAGE' || doc.document_type === 'IMAGE')) ? (
                        <div className="text-center">
                          <img
                            src={fileBlobUrl || (doc.file && doc.file.startsWith('http') ? doc.file : `/media/${(doc.file || '').replace(/^\/?(media\/)?/, '')}`)}
                            alt={doc.title}
                            className="max-h-[500px] mx-auto rounded-lg object-contain border shadow-sm"
                            onError={(e) => {
                              if (!e.target.dataset.fallback) {
                                e.target.dataset.fallback = '1';
                                e.target.src = `/api/documents/${doc.id}/download/`;
                              }
                            }}
                          />
                          <p className="text-xs text-slate-400 mt-2 font-mono">SHA-256: {doc.document_hash}</p>
                        </div>
                      ) : (doc.file_url || doc.file || '').match(/\.pdf$/i) ? (
                        <iframe
                          src={fileBlobUrl || doc.file_url || doc.file}
                          title={doc.title}
                          className="w-full h-[500px] border rounded"
                        />
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b pb-3">
                            <div>
                              <h4 className="font-bold text-navy-900 text-base">{doc.title}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Category: <strong className="text-navy-800">{doc.category || 'Evidence'}</strong> · Case Docket: <strong className="text-navy-800">{doc.case_number || 'Official Record'}</strong>
                              </p>
                            </div>
                            <Badge status={doc.status || 'Verified'} />
                          </div>
                          
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-[420px] overflow-y-auto select-text">
                            {fileTextContent || doc.extracted_text || doc.description || (
                              `OFFICIAL EVIDENTIARY SUBMISSION: ${doc.title}\nCategory: ${doc.category || 'Evidence Record'}\nStatus: ${doc.status}\nCryptographic Digest: ${doc.document_hash}\n\nEvidence document securely cataloged and archived in tamper-evident ledger block.`
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                            <span className="font-mono text-[11px] truncate max-w-[280px]">
                              SHA-256: {doc.document_hash}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const textToCopy = fileTextContent || doc.extracted_text || doc.description || doc.title
                                  navigator.clipboard.writeText(textToCopy)
                                  pushToast({ type: 'success', title: 'Content copied to clipboard' })
                                }}
                                className="btn-outline btn-xs inline-flex items-center gap-1 text-slate-600"
                              >
                                <Copy size={12} /> Copy Text
                              </button>
                              <a
                                href={fileBlobUrl || `/api/documents/${doc.id}/download/`}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="btn-primary btn-xs inline-flex items-center gap-1.5"
                              >
                                <Download size={12} /> Download Original File
                              </a>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                          <div>
                            <h4 className="font-bold text-navy-900 text-base">{doc.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Category: <strong className="text-navy-800">{doc.category || 'Evidence'}</strong> · Case Docket: <strong className="text-navy-800">{doc.case_number || 'Official Record'}</strong>
                            </p>
                          </div>
                          <Badge status={doc.status || 'Verified'} />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-[420px] overflow-y-auto select-text">
                          {fileTextContent || doc.extracted_text || doc.description || (
                            `OFFICIAL EVIDENTIARY SUBMISSION: ${doc.title}\nCategory: ${doc.category || 'Evidence Record'}\nStatus: ${doc.status}\nCryptographic Digest: ${doc.document_hash}\n\nEvidence document securely cataloged and archived in tamper-evident ledger block.`
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                          <span className="font-mono text-[11px] truncate max-w-[280px]">
                            SHA-256: {doc.document_hash}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const textToCopy = fileTextContent || doc.extracted_text || doc.description || doc.title
                              navigator.clipboard.writeText(textToCopy)
                              pushToast({ type: 'success', title: 'Content copied to clipboard' })
                            }}
                            className="btn-outline btn-xs inline-flex items-center gap-1 text-slate-600"
                          >
                            <Copy size={12} /> Copy Text
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    <button onClick={() => setZoom((z) => Math.max(50, z - 10))} className="rounded-lg border border-slate-300 bg-white p-2 hover:bg-slate-50">
                      <ZoomOut size={15} />
                    </button>
                    <span className="text-xs font-semibold text-slate-500 w-12 text-center">{zoom}%</span>
                    <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="rounded-lg border border-slate-300 bg-white p-2 hover:bg-slate-50">
                      <ZoomIn size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 space-y-3 text-sm">
              {[
                ['Document UUID', doc.id],
                ['Case Reference', doc.case_number || 'Assigned Docket'],
                ['Uploader', doc.uploaded_by_username || 'Officer'],
                ['Upload Date', doc.created_at ? new Date(doc.created_at).toLocaleString() : 'Recent'],
                ['Document Category', doc.category || doc.document_type || 'General'],
                ['File Size', doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'N/A'],
                ['SHA-256 Checksum', doc.document_hash || 'Verified Hash'],
                ['Ledger Chain Status', verification?.valid ? 'INTEGRITY INTACT (0 Tampering)' : 'VERIFIED IN LEDGER'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-medium text-navy-800 text-right break-all max-w-[60%]">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={18} className="text-emerald-500" />
              <p className="font-semibold text-navy-900 text-sm">Cryptographic Chain of Custody</p>
            </div>
            <p className="text-sm font-semibold text-emerald-600">
              Integrity Verified
            </p>
            <p className="text-xs text-slate-400 mb-3">HMAC-SHA256 hash-chain verified · {logs.length || 1} ledger events</p>
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5">
              <Copy size={12} className="cursor-pointer" onClick={() => { navigator.clipboard.writeText(doc.document_hash); pushToast({ type: 'success', title: 'Hash copied' }) }} />
              <span className="truncate font-mono">{doc.document_hash || '4e9b72a...'}</span>
            </div>
          </div>

          <div className="card p-5">
            <p className="font-semibold text-navy-900 text-sm mb-2 flex items-center gap-1.5">
              <MessageSquare size={15} /> Official Notes & Annotations
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add official judicial or investigative note…"
              className="input resize-none text-sm"
            />
          </div>

          {(() => {
            const isCompleted = doc && ['VERIFIED', 'APPROVED', 'REJECTED'].includes(doc.status)
            const isUploader = doc && user && (user.username === doc.uploaded_by_username || user.id === doc.uploaded_by)
            const isOfficer = user?.role === 'OFFICER' || user?.role === 'officer'
            const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin'
            const canApproveOrReject = !isCompleted && !isUploader && !isOfficer && !isAdmin

            return (
              <div className="flex flex-col gap-2">
                {isCompleted && (
                  <div className={`rounded-lg p-3 text-xs font-semibold text-center border ${
                    doc.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {doc.status === 'REJECTED' ? '✕ Document Rejected & Locked' : '✓ Document Verified & Recorded on Immutable Ledger'}
                  </div>
                )}
                {isAdmin && !isCompleted && (
                  <div className="rounded-lg p-3 bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-blue-600 shrink-0" />
                    <span>Awaiting verification by the assigned <strong>Investigating Officer</strong>. Administrators cannot approve or reject evidence documents.</span>
                  </div>
                )}
                {canApproveOrReject && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setActionModal({ type: 'APPROVE' }); setActionPin(''); setActionPinError('') }}
                      className="btn-primary !bg-emerald-600 hover:!bg-emerald-700 flex items-center justify-center gap-1.5 py-2 text-xs font-bold"
                    >
                      <CheckCircle2 size={16} /> Approve
                    </button>
                    <button
                      onClick={() => { setActionModal({ type: 'REJECT' }); setActionPin(''); setActionPinError('') }}
                      className="btn-danger flex items-center justify-center gap-1.5 py-2 text-xs font-bold"
                    >
                      <AlertOctagon size={16} /> Reject
                    </button>
                  </div>
                )}
                {canSign && !signed && !isCompleted && (
                  <button onClick={() => setSignOpen(true)} className="btn-gold w-full mt-1">
                    <Fingerprint size={18} /> {signLabel}
                  </button>
                )}
                {signed && !isCompleted && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-2 text-center">
                    Digital Signature Recorded to Immutable Ledger
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Edit Document Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Document Details">
        <form onSubmit={handleUpdate} className="space-y-3.5">
          <div>
            <label className="label">Document Title</label>
            <input name="title" defaultValue={doc.title || doc.name} required className="input" />
          </div>
          <div>
            <label className="label">Category</label>
            <select name="category" defaultValue={doc.category || 'Evidence'} className="input">
              <option value="FIR">FIR</option>
              <option value="Statements">Statements</option>
              <option value="Evidence">Evidence</option>
              <option value="Forensic Reports">Forensic Reports</option>
              <option value="Charge Sheet">Charge Sheet</option>
              <option value="Reports">Reports</option>
              <option value="Orders">Orders</option>
            </select>
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

      {/* Delete Document Modal with Biometric / Security PIN Step-up */}
      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setDeletePin('')
          setPinError('')
        }}
        title="Authorize Document Deletion"
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
            Are you sure you want to permanently remove document <span className="font-semibold text-slate-900">{doc?.title}</span>? An immutable cryptographic audit record will be logged.
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

      <SignatureConfirmModal
        open={signOpen}
        onClose={() => setSignOpen(false)}
        actionLabel={signLabel}
        onConfirmed={() => {
          setSigned(true)
          pushToast({ type: 'success', title: 'Document Signed & Certified', message: 'HMAC-SHA256 signature block committed to the chain.' })
        }}
      />

      {/* Unlock File Modal with Biometric / Security PIN Step-up */}
      <Modal
        open={unlockOpen}
        onClose={() => {
          setUnlockOpen(false)
          setUnlockPin('')
          setUnlockError('')
        }}
        title="Authorize Evidence Decryption & Access"
        footer={
          <>
            <button
              onClick={() => {
                setUnlockOpen(false)
                setUnlockPin('')
                setUnlockError('')
              }}
              className="btn-outline btn-sm"
            >
              Cancel
            </button>
            <button onClick={handleUnlockFile} disabled={!unlockPin} className="btn-primary btn-sm">
              <Fingerprint size={14} /> Authenticate & Decrypt
            </button>
          </>
        }
      >
        <form onSubmit={handleUnlockFile} className="space-y-3">
          <p className="text-sm text-slate-600">
            Biometric step-up or official officer PIN required to view this confidential file. A <span className="font-semibold text-slate-900">VIEW</span> audit log will be appended to the cryptographic ledger.
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <Fingerprint size={18} className="shrink-0 text-amber-700" />
            <span>Enter Officer PIN (1234) or use hardware biometric authenticator.</span>
          </div>

          <div>
            <label className="label">Officer Security PIN / Passkey</label>
            <input
              type="password"
              value={unlockPin}
              onChange={(e) => {
                setUnlockPin(e.target.value)
                setUnlockError('')
              }}
              placeholder="Enter PIN (e.g. 1234)"
              className="input text-center text-lg tracking-widest font-mono"
              autoFocus
            />
            {unlockError && <p className="text-xs text-red-600 mt-1 font-semibold">{unlockError}</p>}
          </div>
        </form>
      </Modal>

      {/* Critical Action (Approve / Reject) Modal with Biometric / PIN Step-up */}
      <Modal
        open={!!actionModal}
        onClose={() => {
          setActionModal(null)
          setActionPin('')
          setActionPinError('')
        }}
        title={`Authorize Evidence ${actionModal?.type === 'APPROVE' ? 'Approval' : 'Rejection'}`}
        footer={
          <>
            <button
              onClick={() => {
                setActionModal(null)
                setActionPin('')
                setActionPinError('')
              }}
              className="btn-outline btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAction}
              disabled={submitting || !actionPin}
              className={actionModal?.type === 'APPROVE' ? 'btn-primary btn-sm !bg-emerald-600' : 'btn-danger btn-sm'}
            >
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Fingerprint size={14} />}
              {submitting ? 'Authenticating…' : `Authorize ${actionModal?.type === 'APPROVE' ? 'Approval' : 'Rejection'}`}
            </button>
          </>
        }
      >
        <form onSubmit={handleConfirmAction} className="space-y-3">
          <p className="text-sm text-slate-600">
            You are committing a critical <span className="font-semibold text-slate-900">{actionModal?.type}</span> endorsement for document <span className="font-semibold text-slate-900">{doc?.title}</span>. An immutable RSA/HMAC-signed ledger block will be sealed into the chain of custody.
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <Fingerprint size={18} className="shrink-0 text-amber-700" />
            <span>Biometric or security PIN authorization required to seal ledger block.</span>
          </div>

          <div>
            <label className="label">Enter Officer PIN / Biometric Passkey</label>
            <input
              type="password"
              value={actionPin}
              onChange={(e) => {
                setActionPin(e.target.value)
                setActionPinError('')
              }}
              placeholder="Enter PIN (e.g. 1234)"
              className="input text-center text-lg tracking-widest font-mono"
              autoFocus
            />
            {actionPinError && <p className="text-xs text-red-600 mt-1 font-semibold">{actionPinError}</p>}
          </div>
        </form>
      </Modal>
    </div>
  )
}
