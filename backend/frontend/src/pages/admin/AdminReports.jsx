import { useState } from 'react'
import { ShieldCheck, Package, Activity, FolderGit2, Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import { useUI } from '../../context/UIContext'
import { fetchAuditLogs, fetchEvidenceList, fetchCases, fetchAnomalies } from '../../api/realApi'

const ADMIN_REPORTS = [
  {
    id: 'chain_audit',
    title: 'Cryptographic Chain Audit Report',
    description: 'Complete cryptographic verification report with per-block HMAC-SHA256 signatures.',
    icon: ShieldCheck,
  },
  {
    id: 'vault_inventory',
    title: 'Physical Evidence & Vault Report',
    description: 'Inventory of physical evidence, storage facilities, custody transactions, and seal records.',
    icon: Package,
  },
  {
    id: 'telemetry_audit',
    title: 'User Access & Anomaly Telemetry Report',
    description: 'Detailed log of user logins, anomalous document views, and role elevation activities.',
    icon: Activity,
  },
  {
    id: 'docket_disposition',
    title: 'Case Docket Disposition Report',
    description: 'Summary of all registered case dockets, investigating officers, and judicial review statuses.',
    icon: FolderGit2,
  },
]

export default function AdminReports() {
  const [loadingId, setLoadingId] = useState(null)
  const { pushToast } = useUI()

  const handleGenerateReport = async (report) => {
    setLoadingId(report.id)
    try {
      let reportData = null
      if (report.id === 'chain_audit') {
        const logs = await fetchAuditLogs()
        reportData = {
          report_name: report.title,
          generated_at: new Date().toISOString(),
          record_count: Array.isArray(logs) ? logs.length : 0,
          blocks: logs,
        }
      } else if (report.id === 'vault_inventory') {
        const evidence = await fetchEvidenceList()
        reportData = {
          report_name: report.title,
          generated_at: new Date().toISOString(),
          record_count: Array.isArray(evidence) ? evidence.length : 0,
          inventory: evidence,
        }
      } else if (report.id === 'telemetry_audit') {
        const [anomalies, loginLogs] = await Promise.all([
          fetchAnomalies().catch(() => []),
          fetchAuditLogs({ action: 'LOGIN' }).catch(() => []),
        ])
        reportData = {
          report_name: report.title,
          generated_at: new Date().toISOString(),
          anomalies_detected: anomalies,
          session_telemetry: loginLogs,
        }
      } else {
        const cases = await fetchCases()
        reportData = {
          report_name: report.title,
          generated_at: new Date().toISOString(),
          record_count: Array.isArray(cases) ? cases.length : 0,
          dockets: cases,
        }
      }

      const jsonStr = JSON.stringify(reportData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const fileName = `${report.id}_${new Date().toISOString().slice(0, 10)}.json`
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      pushToast({
        type: 'success',
        title: 'Report Generated & Downloaded',
        message: `${report.title} exported as ${fileName}.`,
      })
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Export Failed',
        message: err.message || 'Could not fetch report data.',
      })
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate and export system & cryptographic reports" />
      <div className="grid sm:grid-cols-2 gap-4">
        {ADMIN_REPORTS.map((r) => {
          const Icon = r.icon
          const isLoading = loadingId === r.id
          return (
            <div key={r.id} className="card p-5">
              <div className="rounded-lg bg-navy-50 p-2.5 text-navy-700 w-fit mb-3">
                <Icon size={20} />
              </div>
              <p className="font-semibold text-navy-900 text-sm">{r.title}</p>
              <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">{r.description}</p>
              <button
                onClick={() => handleGenerateReport(r)}
                disabled={isLoading}
                className="btn-outline btn-sm w-full flex items-center justify-center gap-1.5"
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                {isLoading ? 'Compiling Report…' : 'Generate & Export Report'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
