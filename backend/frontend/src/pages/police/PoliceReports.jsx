import { useState } from 'react'
import { BookOpen, Package, FileCheck, Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import { useUI } from '../../context/UIContext'
import { fetchCases, fetchEvidenceList, fetchAuditLogs } from '../../api/realApi'

const POLICE_REPORTS = [
  {
    id: 'station_gd',
    title: 'Daily Police Station General Diary (GD)',
    description: 'Consolidated summary of daily station entries, cognizable offenses & FIRs.',
    icon: BookOpen,
  },
  {
    id: 'malkhana_seizure',
    title: 'Malkhana Physical Seizure Inventory',
    description: 'Catalog of physical items, weapons, narcotics & digital seized items stored.',
    icon: Package,
  },
  {
    id: 'fir_status',
    title: 'FIR Investigation Status Report',
    description: 'Status breakdown of all active FIR investigations, assigned IOs & chargesheets.',
    icon: FileCheck,
  },
]

export default function PoliceReports() {
  const [loadingId, setLoadingId] = useState(null)
  const { pushToast } = useUI()

  const handleGenerateReport = async (report) => {
    setLoadingId(report.id)
    try {
      let reportData = null
      if (report.id === 'station_gd') {
        const logs = await fetchAuditLogs()
        reportData = {
          report_name: report.title,
          generated_at: new Date().toISOString(),
          record_count: Array.isArray(logs) ? logs.length : 0,
          entries: logs,
        }
      } else if (report.id === 'malkhana_seizure') {
        const evidence = await fetchEvidenceList()
        reportData = {
          report_name: report.title,
          generated_at: new Date().toISOString(),
          record_count: Array.isArray(evidence) ? evidence.length : 0,
          malkhana_items: evidence,
        }
      } else {
        const cases = await fetchCases()
        reportData = {
          report_name: report.title,
          generated_at: new Date().toISOString(),
          record_count: Array.isArray(cases) ? cases.length : 0,
          firs: cases,
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
        title: 'Report Generated',
        message: `${report.title} exported as ${fileName}.`,
      })
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Export Failed',
        message: err.message || 'Could not compile report data.',
      })
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Police Station Reports" subtitle="Generate and export station and investigation reports" />
      <div className="grid sm:grid-cols-2 gap-4">
        {POLICE_REPORTS.map((r) => {
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
                {isLoading ? 'Exporting…' : 'Generate & Export Report'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
