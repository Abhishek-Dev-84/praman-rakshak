import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import FileDropzone from '../../components/common/FileDropzone'
import { useUI } from '../../context/UIContext'
import { fetchCases, uploadDocument } from '../../api/realApi'

export default function CreateDocument() {
  const [searchParams] = useSearchParams()
  const [cases, setCases] = useState([])
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({
    type: searchParams.get('category') || 'FIR',
    caseId: searchParams.get('caseId') || '',
    title: '',
    description: '',
    classification: 'CONFIDENTIAL',
  })
  const [reviewing, setReviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { pushToast } = useUI()
  const navigate = useNavigate()

  useEffect(() => {
    async function loadCases() {
      try {
        const data = await fetchCases()
        setCases(Array.isArray(data) ? data : data?.results || [])
      } catch (err) {
        console.error('Failed to load cases:', err)
      }
    }
    loadCases()
  }, [])

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const goToReview = (e) => {
    e.preventDefault()
    if (!file) {
      pushToast({ type: 'error', title: 'Please attach a document file to continue' })
      return
    }
    if (!form.caseId) {
      pushToast({ type: 'error', title: 'Please select a case docket' })
      return
    }
    setReviewing(true)
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', form.title || file.name)
      formData.append('case', form.caseId)
      formData.append('category', form.type)
      formData.append('classification', form.classification)
      if (form.description) formData.append('description', form.description)

      await uploadDocument(formData)
      pushToast({ type: 'success', title: 'Document uploaded & cryptographically sealed', message: form.title || file.name })
      navigate('/investigator/documents')
    } catch (err) {
      pushToast({ type: 'error', title: 'Upload failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (reviewing) {
    return (
      <div>
        <PageHeader title="Review Document & Cryptographic Seal" subtitle="Confirm metadata and cryptographic binding before committing to ledger" back />
        <div className="card p-5 max-w-lg">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-4">
            <div className="rounded-lg bg-navy-50 p-2.5 text-navy-700 text-xs font-bold uppercase">{file.name.split('.').pop() || 'FILE'}</div>
            <div className="min-w-0">
              <p className="font-semibold text-navy-900 text-sm truncate">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB · Ready for Ingestion</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Document Metadata</p>
          <div className="space-y-2.5 text-sm mb-4">
            <div className="flex justify-between"><span className="text-slate-400">Title</span><span className="font-medium text-navy-800">{form.title}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Case Docket</span><span className="font-medium text-navy-800">{form.caseId}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Category</span><span className="font-medium text-navy-800">{form.type}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Classification</span><span className="font-medium text-navy-800">{form.classification}</span></div>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2.5 mb-4">
            <ShieldCheck size={18} className="text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">HMAC-SHA256 Ready</p>
              <p className="text-xs text-emerald-600">The file will be hashed in memory upon arrival and sealed in the ledger.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setReviewing(false)} className="btn-outline flex-1">
              Back to Edit
            </button>
            <button onClick={submit} disabled={submitting} className="btn-primary flex-1">
              {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
              {submitting ? 'Committing…' : 'Upload & Commit'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Upload & Seal Document" subtitle="Upload and record an official digital document to an assigned case docket" />
      <form onSubmit={goToReview} className="card p-5 max-w-lg space-y-4">
        <div>
          <label className="label">Document Category</label>
          <select value={form.type} onChange={update('type')} required className="input">
            <option value="FIR">FIR</option>
            <option value="Victim/Complainant Statement">Victim/Complainant Statement</option>
            <option value="Witness Statements">Witness Statements</option>
            <option value="Arrest Records">Arrest Records</option>
            <option value="Search & Seizure Memo">Search & Seizure Memo</option>
            <option value="Evidence List">Evidence List</option>
            <option value="Digital Evidence Record">Digital Evidence Record</option>
            <option value="Medical/MLC Record">Medical/MLC Record</option>
            <option value="Forensic/FSL Record">Forensic/FSL Record</option>
            <option value="Final Case Report">Final Case Report (Investigation Closure)</option>
          </select>
        </div>
        <div>
          <label className="label">Select Case Docket</label>
          <select value={form.caseId} onChange={update('caseId')} required className="input">
            <option value="">-- Choose Case Docket --</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number || c.id} — {c.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Document Title</label>
          <input value={form.title} onChange={update('title')} required className="input" placeholder="e.g. Crime Scene Forensic Analysis Report" />
        </div>
        <div>
          <label className="label">Description / Remarks (Optional)</label>
          <textarea value={form.description} onChange={update('description')} rows={3} className="input resize-none" placeholder="Enter official remarks or context" />
        </div>
        <div>
          <label className="label">Upload Digital File (PDF, DOCX, JPEG, PNG)</label>
          <FileDropzone file={file} onFileSelected={setFile} maxSizeMb={25} />
        </div>
        <div>
          <label className="label">Security Classification</label>
          <select value={form.classification} onChange={update('classification')} className="input">
            <option value="CONFIDENTIAL">Confidential (Court & Police Only)</option>
            <option value="OFFICIAL">Official Use Only</option>
            <option value="PUBLIC">Public Record</option>
          </select>
        </div>
        <button type="submit" className="btn-primary w-full">
          Proceed to Verification
        </button>
      </form>
    </div>
  )
}
