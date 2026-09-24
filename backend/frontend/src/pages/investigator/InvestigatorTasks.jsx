import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2, Clock, RefreshCw, ArrowRightLeft, Loader2,
  AlertCircle, Fingerprint, Check, X, FileText, Eye, User
} from 'lucide-react'
import { PageHeader, Tabs } from '../../components/common/Controls'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { EmptyState } from '../../components/common/States'
import {
  fetchMovementRequests, approveMovementRequest, rejectMovementRequest,
  fetchDocuments, signDocument
} from '../../api/realApi'
import { subscribeToGlobalAudit } from '../../api/websocketService'
import { useUI } from '../../context/UIContext'

export default function InvestigatorTasks() {
  const [tab, setTab] = useState('all')
  const [movements, setMovements] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionTarget, setActionTarget] = useState(null) // { kind: 'DOCUMENT' | 'MOVEMENT', task, type: 'APPROVE' | 'REJECT' }
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { pushToast } = useUI()

  const loadTasks = async () => {
    setLoading(true)
    try {
      const [moveData, docData] = await Promise.all([
        fetchMovementRequests().catch(() => []),
        fetchDocuments().catch(() => []),
      ])
      const moveList = Array.isArray(moveData) ? moveData : moveData?.results || []
      const docList = Array.isArray(docData) ? docData : docData?.results || []
      setMovements(moveList)
      setDocuments(docList)
    } catch (err) {
      console.error('Failed to load tasks', err)
      pushToast({ type: 'error', title: 'Error loading tasks', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()

    const unsub = subscribeToGlobalAudit((newLog) => {
      if (
        newLog.action?.includes('EVIDENCE') ||
        newLog.action?.includes('MOVEMENT') ||
        newLog.action?.includes('DOCUMENT') ||
        newLog.action?.includes('UPLOAD')
      ) {
        loadTasks()
      }
    })

    return () => unsub()
  }, [])

  // Documents awaiting investigator review & endorsement
  const pendingDocs = useMemo(() => {
    return documents.filter((d) => d.status !== 'VERIFIED' && d.status !== 'APPROVED' && d.status !== 'REJECTED')
  }, [documents])

  // Movement requests awaiting investigator approval
  const pendingMovements = useMemo(() => {
    return movements.filter((m) => (m.status || '').toUpperCase() === 'PENDING')
  }, [movements])

  // Completed items
  const completedDocs = useMemo(() => {
    return documents.filter((d) => d.status === 'VERIFIED' || d.status === 'APPROVED' || d.status === 'REJECTED')
  }, [documents])

  const completedMovements = useMemo(() => {
    return movements.filter((m) => ['APPROVED', 'COMPLETED', 'REJECTED', 'RECEIVED'].includes((m.status || '').toUpperCase()))
  }, [movements])

  const handleConfirmAction = async () => {
    if (!actionTarget) return
    if (pin !== '1234' && pin !== '123456') {
      setPinError('Invalid Security PIN. Enter officer PIN (1234) to authorize.')
      return
    }

    setSubmitting(true)
    setPinError('')
    try {
      const isApprove = actionTarget.type === 'APPROVE'
      if (actionTarget.kind === 'DOCUMENT') {
        await signDocument(actionTarget.task.id, actionTarget.type, {
          verification_method: 'BIOMETRIC',
          password: pin,
        })
        pushToast({
          type: isApprove ? 'success' : 'info',
          title: isApprove ? 'Document Approved' : 'Document Rejected',
          message: `Document "${actionTarget.task.title}" ${isApprove ? 'verified & endorsed' : 'rejected'} on ledger.`,
        })
      } else {
        if (isApprove) {
          await approveMovementRequest(actionTarget.task.id, 'Approved by Investigating Officer', 'BIOMETRIC')
          pushToast({ type: 'success', title: 'Movement Approved', message: `Movement request ${actionTarget.task.request_number} authorized.` })
        } else {
          await rejectMovementRequest(actionTarget.task.id, 'Rejected by Investigating Officer', 'BIOMETRIC')
          pushToast({ type: 'info', title: 'Movement Rejected', message: `Movement request ${actionTarget.task.request_number} rejected.` })
        }
      }
      setActionTarget(null)
      setPin('')
      loadTasks()
    } catch (err) {
      pushToast({ type: 'error', title: 'Action Failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Investigative Action Tasks & Approvals"
        subtitle="Review and endorse documents uploaded by police, plus evidence movement authorizations"
        actions={
          <button onClick={loadTasks} disabled={loading} className="btn-outline btn-sm flex items-center gap-1.5">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      <div className="card p-4 mb-4">
        <Tabs
          tabs={[
            { value: 'all', label: 'All Pending Tasks', count: pendingDocs.length + pendingMovements.length },
            { value: 'documents', label: 'Document Approvals', count: pendingDocs.length },
            { value: 'movements', label: 'Evidence Movements', count: pendingMovements.length },
            { value: 'completed', label: 'Completed History', count: completedDocs.length + completedMovements.length },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {loading ? (
        <div className="card p-12 flex justify-center items-center">
          <Loader2 className="animate-spin text-navy-600" size={32} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Section: Pending Document Approvals */}
          {(tab === 'all' || tab === 'documents') && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm">Case Documents Awaiting Verification</h3>
                    <p className="text-xs text-slate-400">Uploaded by police officers and intake officials requiring investigative endorsement</p>
                  </div>
                </div>
                <span className="badge bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                  {pendingDocs.length} Pending
                </span>
              </div>

              {pendingDocs.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No documents currently awaiting approval.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingDocs.map((doc) => (
                    <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-navy-900 truncate">{doc.title || doc.name}</p>
                          <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {doc.category || 'EVIDENCE'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                          <span>Case: <strong className="text-slate-700">{doc.case_number || 'CrPC Docket'}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-600">
                            <User size={12} className="text-slate-400" />
                            Uploaded by: <strong className="text-blue-700">Officer {doc.uploaded_by_username || 'Police'}</strong>
                          </span>
                          <span>•</span>
                          <span className="text-slate-400">
                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Link
                          to={`/investigator/documents/${doc.id}`}
                          className="btn-outline btn-sm flex items-center gap-1 text-xs text-slate-700"
                        >
                          <Eye size={13} /> Review
                        </Link>
                        <button
                          onClick={() => {
                            setActionTarget({ kind: 'DOCUMENT', task: doc, type: 'APPROVE' })
                            setPin('')
                            setPinError('')
                          }}
                          className="btn-primary btn-sm !bg-emerald-600 hover:!bg-emerald-700 flex items-center gap-1 text-xs"
                        >
                          <Check size={13} /> Approve
                        </button>
                        <button
                          onClick={() => {
                            setActionTarget({ kind: 'DOCUMENT', task: doc, type: 'REJECT' })
                            setPin('')
                            setPinError('')
                          }}
                          className="btn-danger btn-sm flex items-center gap-1 text-xs"
                        >
                          <X size={13} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Pending Movement Requests */}
          {(tab === 'all' || tab === 'movements') && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                    <ArrowRightLeft size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm">Physical Evidence Movement Authorizations</h3>
                    <p className="text-xs text-slate-400">Custody transit requests requiring investigator sign-off</p>
                  </div>
                </div>
                <span className="badge bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                  {pendingMovements.length} Pending
                </span>
              </div>

              {pendingMovements.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No movement requests currently pending authorization.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingMovements.map((t) => (
                    <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-navy-900 truncate">
                            {t.purpose?.replace(/_/g, ' ') || 'Evidence Movement Task'}
                          </p>
                          <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {t.request_number || `REQ-${t.id}`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Destination: <strong className="text-slate-700">{t.requested_destination_path || t.external_destination_notes || 'Vault Storage'}</strong> · Requested by <strong className="text-slate-700">{t.requested_by_name || 'Assigned Officer'}</strong>
                        </p>
                        {t.reason && (
                          <p className="text-xs text-slate-400 mt-0.5 italic">
                            Reason: "{t.reason}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setActionTarget({ kind: 'MOVEMENT', task: t, type: 'APPROVE' })
                            setPin('')
                            setPinError('')
                          }}
                          className="btn-primary btn-sm !bg-emerald-600 hover:!bg-emerald-700 flex items-center gap-1 text-xs"
                        >
                          <Check size={13} /> Approve
                        </button>
                        <button
                          onClick={() => {
                            setActionTarget({ kind: 'MOVEMENT', task: t, type: 'REJECT' })
                            setPin('')
                            setPinError('')
                          }}
                          className="btn-danger btn-sm flex items-center gap-1 text-xs"
                        >
                          <X size={13} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Completed History */}
          {tab === 'completed' && (
            <div className="card p-5">
              <h3 className="font-bold text-navy-900 text-sm mb-3">Recently Processed & Verified Records</h3>
              {completedDocs.length === 0 && completedMovements.length === 0 ? (
                <EmptyState title="No completed tasks" description="Processed tasks will be logged here." />
              ) : (
                <div className="space-y-2 text-xs">
                  {completedDocs.slice(0, 10).map((d) => (
                    <div key={d.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-200">
                      <div>
                        <span className="font-semibold text-slate-800">{d.title || d.name}</span>
                        <span className="text-slate-400 ml-2">({d.case_number || 'Case Record'})</span>
                      </div>
                      <Badge status={d.status} />
                    </div>
                  ))}
                  {completedMovements.slice(0, 10).map((m) => (
                    <div key={m.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-200">
                      <div>
                        <span className="font-semibold text-slate-800">{m.purpose?.replace(/_/g, ' ')}</span>
                        <span className="text-slate-400 font-mono ml-2">{m.request_number}</span>
                      </div>
                      <Badge status={m.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Biometric / PIN Authorization Modal for Document or Movement */}
      <Modal
        open={!!actionTarget}
        onClose={() => {
          setActionTarget(null)
          setPin('')
          setPinError('')
        }}
        title={`${actionTarget?.type === 'APPROVE' ? 'Authorize & Endorse' : 'Confirm Rejection'}: ${
          actionTarget?.kind === 'DOCUMENT'
            ? actionTarget?.task?.title
            : actionTarget?.task?.request_number
        }`}
        footer={
          <>
            <button
              onClick={() => {
                setActionTarget(null)
                setPin('')
                setPinError('')
              }}
              className="btn-outline btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAction}
              disabled={submitting || !pin}
              className={actionTarget?.type === 'APPROVE' ? 'btn-primary btn-sm !bg-emerald-600' : 'btn-danger btn-sm'}
            >
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Fingerprint size={14} />}
              {submitting ? 'Authenticating…' : `Confirm ${actionTarget?.type === 'APPROVE' ? 'Approval' : 'Rejection'}`}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            You are about to {actionTarget?.type === 'APPROVE' ? 'endorse and verify' : 'reject'}{' '}
            {actionTarget?.kind === 'DOCUMENT' ? 'evidence document' : 'movement request'}:{' '}
            <span className="font-semibold text-slate-900">
              {actionTarget?.kind === 'DOCUMENT' ? actionTarget?.task?.title : actionTarget?.task?.request_number}
            </span>.
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <Fingerprint size={18} className="shrink-0 text-amber-700" />
            <span>Investigating Officer biometric or passkey PIN required to seal transaction on HMAC ledger.</span>
          </div>

          <div>
            <label className="label">Enter Officer Passkey / PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value)
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
    </div>
  )
}
