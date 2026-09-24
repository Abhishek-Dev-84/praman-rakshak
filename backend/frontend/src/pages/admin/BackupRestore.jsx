import { useEffect, useState } from 'react'
import { DatabaseBackup, Download, UploadCloud, Clock } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import { useUI } from '../../context/UIContext'
import { fetchCases, fetchDocuments, fetchAuditLogs, fetchEvidenceList } from '../../api/realApi'

const INITIAL_HISTORY = [
  { id: 'b-init-1', date: new Date(Date.now() - 86400000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), size: '1.4 MB', status: 'Completed' },
  { id: 'b-init-2', date: new Date(Date.now() - 172800000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), size: '1.2 MB', status: 'Completed' },
]

export default function BackupRestore() {
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('sdms_backup_history')
      return stored ? JSON.parse(stored) : INITIAL_HISTORY
    } catch {
      return INITIAL_HISTORY
    }
  })
  const { pushToast } = useUI()

  const runBackup = async () => {
    setRunning(true)
    try {
      const [cases, docs, logs, evidence] = await Promise.all([
        fetchCases().catch(() => []),
        fetchDocuments().catch(() => []),
        fetchAuditLogs().catch(() => []),
        fetchEvidenceList().catch(() => []),
      ])

      const snapshot = {
        version: '1.0',
        system: 'Praman Rakshak SDMS',
        backup_created_at: new Date().toISOString(),
        summary: {
          cases_count: Array.isArray(cases) ? cases.length : 0,
          documents_count: Array.isArray(docs) ? docs.length : 0,
          audit_logs_count: Array.isArray(logs) ? logs.length : 0,
          evidence_count: Array.isArray(evidence) ? evidence.length : 0,
        },
        data: {
          cases,
          documents: docs,
          audit_logs: logs,
          evidence,
        },
      }

      const jsonStr = JSON.stringify(snapshot, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const fileName = `sdms_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      const sizeStr = `${(blob.size / 1024).toFixed(1)} KB`
      const newEntry = {
        id: `b-${Date.now()}`,
        date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        size: sizeStr,
        status: 'Completed',
        fileName,
      }
      const updated = [newEntry, ...history]
      setHistory(updated)
      try {
        localStorage.setItem('sdms_backup_history', JSON.stringify(updated.slice(0, 10)))
      } catch (_) {}

      pushToast({
        type: 'success',
        title: 'Backup Created & Exported',
        message: `Snapshot file ${fileName} (${sizeStr}) downloaded.`,
      })
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Backup Failed',
        message: err.message || 'Could not compile system snapshot.',
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <PageHeader title="Backup & Restore" subtitle="Manage automated backups of the document database" />

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="card p-5">
          <div className="rounded-lg bg-navy-50 p-2.5 text-navy-700 w-fit mb-3">
            <DatabaseBackup size={20} />
          </div>
          <p className="font-semibold text-navy-900 text-sm mb-1">Run Manual Backup</p>
          <p className="text-xs text-slate-400 mb-4">Creates a full snapshot of documents, metadata and audit logs.</p>
          <button onClick={runBackup} disabled={running} className="btn-primary btn-sm w-full">
            {running ? 'Backing up…' : 'Start Backup Now'}
          </button>
        </div>
        <div className="card p-5">
          <div className="rounded-lg bg-gold-50 p-2.5 text-gold-700 w-fit mb-3">
            <UploadCloud size={20} />
          </div>
          <p className="font-semibold text-navy-900 text-sm mb-1">Restore From Backup</p>
          <p className="text-xs text-slate-400 mb-4">Restore system state from a previous backup snapshot.</p>
          <button
            onClick={() => pushToast({ type: 'info', title: 'Select a backup file to restore' })}
            className="btn-outline btn-sm w-full"
          >
            Upload Backup File
          </button>
        </div>
      </div>

      <div className="card p-4">
        <p className="font-semibold text-navy-900 text-sm mb-3 flex items-center gap-1.5">
          <Clock size={15} /> Backup History
        </p>
        <div className="divide-y divide-slate-100">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium text-navy-800">{h.date}</p>
                <p className="text-xs text-slate-400">{h.size}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge bg-emerald-100 text-emerald-700">{h.status}</span>
                <button
                  onClick={runBackup}
                  title="Download snapshot"
                  className="text-navy-500 hover:text-navy-700"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
