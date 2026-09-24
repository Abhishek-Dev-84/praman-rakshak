import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ShieldQuestion, Loader2, Radio, ShieldAlert, Link2, ShieldCheck, RefreshCw, FolderGit2 } from 'lucide-react'
import { PageHeader, SearchInput, Tabs } from '../../components/common/Controls'
import { EmptyState } from '../../components/common/States'
import { fetchAuditLogs, fetchCases, fetchCaseDockets, verifyDocumentChain } from '../../api/realApi'
import { subscribeToGlobalAudit, subscribeToCaseAudit } from '../../api/websocketService'
import { useUI } from '../../context/UIContext'

export default function SharedAuditTrail({ showChainDemo = false }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [cases, setCases] = useState([])
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [caseChainStatus, setCaseChainStatus] = useState(null)
  const [verifyingChain, setVerifyingChain] = useState(false)
  const [activeTamperAlert, setActiveTamperAlert] = useState(null)
  const { pushToast } = useUI()

  // Load cases dynamically
  const loadCases = async () => {
    try {
      const data = await fetchCaseDockets().catch(() => fetchCases())
      const list = Array.isArray(data) ? data : data?.results || []
      setCases(list)
    } catch (err) {
      console.error('Failed to load cases:', err)
    }
  }

  useEffect(() => {
    loadCases()
  }, [])

  // Verify case chain whenever selectedCaseId changes
  const runChainVerification = async (caseId) => {
    if (!caseId) {
      setCaseChainStatus(null)
      return
    }
    setVerifyingChain(true)
    try {
      const res = await verifyDocumentChain(caseId)
      setCaseChainStatus(res)
    } catch (err) {
      console.error('Chain verification error:', err)
      setCaseChainStatus({ valid: false, reason: 'Failed to query verification service' })
    } finally {
      setVerifyingChain(false)
    }
  }

  // Load logs and subscribe to WebSocket stream based on selectedCaseId
  useEffect(() => {
    let isSubscribed = true

    async function loadLogs() {
      setLoading(true)
      try {
        const params = selectedCaseId ? { case_id: selectedCaseId } : {}
        const data = await fetchAuditLogs(params)
        if (isSubscribed) {
          setLogs(Array.isArray(data) ? data : data?.results || [])
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err)
        if (isSubscribed) setLogs([])
      } finally {
        if (isSubscribed) setLoading(false)
      }
    }

    loadLogs()
    if (selectedCaseId) {
      runChainVerification(selectedCaseId)
    } else {
      setCaseChainStatus(null)
    }

    const handleNewLog = (newLog) => {
      let isNew = false
      setLogs((prevLogs) => {
        const exists = prevLogs.some((l) => (l.log_id || l.id) === (newLog.log_id || newLog.id))
        if (exists) return prevLogs
        isNew = true
        return [newLog, ...prevLogs]
      })

      // If a case was created or deleted, dynamically reload the cases dropdown
      if (newLog.action === 'CASE_CREATE' || newLog.action === 'CASE_DELETE' || newLog.action === 'CASE_UPDATE') {
        loadCases()
      }

      if (isNew) {
        pushToast({
          type: 'info',
          title: `Live Ledger Block: ${newLog.action}`,
          message: `Recorded by ${newLog.username || 'Officer'} for ${newLog.case_number || 'docket'}.`,
        })
      }

      if (selectedCaseId) {
        runChainVerification(selectedCaseId)
      }
    }

    const handleTamper = (tamperEvent) => {
      console.error('🚨 Live tamper alert received:', tamperEvent)
      setActiveTamperAlert(tamperEvent)
      pushToast({
        type: 'error',
        title: '🚨 CRITICAL TAMPER ALERT',
        message: tamperEvent.message || tamperEvent.reason || 'Cryptographic chain verification failed!',
      })
      if (selectedCaseId) {
        runChainVerification(selectedCaseId)
      }
    }

    let unsubscribe = () => {}
    if (selectedCaseId) {
      unsubscribe = subscribeToCaseAudit(selectedCaseId, handleNewLog, handleTamper)
    } else {
      unsubscribe = subscribeToGlobalAudit(handleNewLog, handleTamper)
    }

    return () => {
      isSubscribed = false
      unsubscribe()
    }
  }, [selectedCaseId])

  const filtered = useMemo(() => {
    let list = logs
    if (tab !== 'all') {
      list = list.filter((l) => (l.action || '').toLowerCase() === tab.toLowerCase())
    }
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(
        (l) =>
          (l.username || '').toLowerCase().includes(q) ||
          (l.action || '').toLowerCase().includes(q) ||
          (l.case_number || '').toLowerCase().includes(q) ||
          (l.current_log_hash || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [logs, tab, query])

  const selectedCaseObj = useMemo(() => {
    return cases.find((c) => c.id === selectedCaseId)
  }, [cases, selectedCaseId])

  return (
    <div>
      <PageHeader
        title="Cryptographic Audit Trail & Hash Chain"
        subtitle="Immutable, HMAC-SHA256 hash-chained ledger recording every single action across individual case dockets"
        actions={
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{selectedCaseId ? `Case Socket Stream Active` : `Global WebSocket Live Active`}</span>
          </div>
        }
      />

      {/* Case Selector Dropdown Header */}
      <div className="card p-4 mb-4 bg-gradient-to-r from-navy-900 to-navy-800 text-white rounded-xl shadow-md border border-navy-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-cyan-400">
              <FolderGit2 size={22} />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-white">Select Case Docket Hash Chain</h3>
              <p className="text-xs text-navy-200">
                Switch case to inspect dedicated HMAC-SHA256 cryptographic ledger blocks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="bg-navy-950 text-white border border-navy-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full md:w-80"
            >
              <option value="">All Case Dockets (Global Stream)</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number} — {c.title.length > 30 ? c.title.substring(0, 30) + '...' : c.title}
                </option>
              ))}
            </select>

            <button
              onClick={loadCases}
              title="Refresh Case Dockets"
              className="p-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg shrink-0"
            >
              <RefreshCw size={14} />
            </button>

            {selectedCaseId && (
              <button
                onClick={() => runChainVerification(selectedCaseId)}
                disabled={verifyingChain}
                title="Verify Case Hash Chain"
                className="btn btn-secondary text-xs px-3 py-2 shrink-0 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <RefreshCw size={14} className={verifyingChain ? 'animate-spin' : ''} />
                <span>Verify</span>
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Case Hash Chain Status Card */}
        {selectedCaseId && (
          <div className="mt-4 pt-4 border-t border-navy-700/80 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-navy-950/60 p-2.5 rounded-lg border border-navy-700/60">
              <span className="text-navy-300 block mb-1">Target Case Docket:</span>
              <span className="font-bold text-cyan-400 text-sm">
                {selectedCaseObj?.case_number || selectedCaseId.substring(0, 8)}
              </span>
            </div>

            <div className="bg-navy-950/60 p-2.5 rounded-lg border border-navy-700/60">
              <span className="text-navy-300 block mb-1">Cryptographic Ledger Integrity:</span>
              <div className="flex items-center gap-1.5 font-bold">
                {verifyingChain ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Loader2 size={13} className="animate-spin" /> Verifying blocks...
                  </span>
                ) : caseChainStatus?.valid ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={14} /> HMAC-SHA256 INTACT
                  </span>
                ) : caseChainStatus?.valid === false ? (
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertTriangle size={14} /> CHAIN COMPROMISED
                  </span>
                ) : (
                  <span className="text-slate-300">Ready</span>
                )}
              </div>
            </div>

            <div className="bg-navy-950/60 p-2.5 rounded-lg border border-navy-700/60">
              <span className="text-navy-300 block mb-1">Chain Depth / Blocks:</span>
              <span className="font-mono font-bold text-white text-sm">
                {caseChainStatus?.block_count ?? logs.length} Blocks Chained
              </span>
            </div>

            <div className="bg-navy-950/60 p-2.5 rounded-lg border border-navy-700/60">
              <span className="text-navy-300 block mb-1">Latest Head Hash:</span>
              <span className="font-mono text-[10px] text-cyan-300 truncate block">
                {caseChainStatus?.latest_hash || logs[0]?.current_log_hash || '0'.repeat(64)}
              </span>
            </div>
          </div>
        )}
      </div>

      {activeTamperAlert && (
        <div className="card p-4 mb-4 bg-red-50 border border-red-300 rounded-xl flex items-start gap-3">
          <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={22} />
          <div className="flex-1 text-sm">
            <p className="font-bold text-red-900">CRITICAL TAMPERING DETECTED IN LEDGER</p>
            <p className="text-red-700 text-xs mt-1">
              {activeTamperAlert.message || activeTamperAlert.reason}
            </p>
            <p className="text-red-600 font-mono text-[11px] mt-1">
              Broken Log ID: {activeTamperAlert.broken_at_log_id || 'Block mismatch'} · Detected at: {activeTamperAlert.detected_at || 'Just now'}
            </p>
          </div>
          <button
            onClick={() => setActiveTamperAlert(null)}
            className="text-xs text-red-700 hover:text-red-900 font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="card p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Tabs
          tabs={[
            { value: 'all', label: 'All Actions' },
            { value: 'login', label: 'Logins' },
            { value: 'view', label: 'Single Clicks (Views)' },
            { value: 'upload', label: 'Uploads' },
            { value: 'approve', label: 'Approvals' },
            { value: 'edit', label: 'Edits' },
            { value: 'delete', label: 'Deletions' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search ledger by user, hash, action…" className="md:w-80" />
      </div>

      {loading ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-navy-600 mb-2" size={28} />
          <p className="text-sm text-slate-500">Verifying and loading HMAC-SHA256 cryptographic chain…</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={selectedCaseId ? "No audit blocks for this case" : "No ledger events found"}
          description={query ? "No cryptographic events match your search query." : "No audit trail logs recorded yet for this selection."}
        />
      ) : (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Timestamp</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Officer / Actor</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Case Docket</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">HMAC Block Hash</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Previous Hash Link</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Verification</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.log_id || log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
                  <td className="px-3 py-3 text-slate-500 whitespace-nowrap text-xs">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                  </td>
                  <td className="px-3 py-3 font-medium text-navy-800 whitespace-nowrap">
                    {log.username || 'Officer'} <span className="text-xs text-slate-400">({log.user_role || 'STAFF'})</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`badge ${
                      log.action === 'LOGIN' ? 'bg-indigo-50 text-indigo-700 font-semibold' :
                      log.action === 'VIEW' ? 'bg-amber-50 text-amber-700 font-semibold' :
                      log.action === 'DELETE' ? 'bg-red-50 text-red-700 font-semibold' :
                      log.action === 'APPROVE' ? 'bg-emerald-50 text-emerald-700 font-semibold' :
                      'bg-navy-50 text-navy-700 font-semibold'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 font-medium">
                    {log.case_number || 'CrPC System'}
                  </td>
                  <td className="px-3 py-3 text-slate-500 font-mono text-[11px] truncate max-w-[130px]" title={log.current_log_hash}>
                    {log.current_log_hash || 'HMAC-SHA256'}
                  </td>
                  <td className="px-3 py-3 text-slate-400 font-mono text-[11px] truncate max-w-[120px]" title={log.previous_log_hash}>
                    {log.previous_log_hash ? `${log.previous_log_hash.substring(0, 10)}…` : 'GENESIS'}
                  </td>
                  <td className="px-3 py-3">
                    <span className="badge bg-emerald-50 text-emerald-700 text-xs flex items-center gap-1 w-fit">
                      <ShieldCheck size={12} />
                      {log.verification_method || 'SYSTEM'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
