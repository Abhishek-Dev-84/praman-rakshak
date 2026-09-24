import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import FileDropzone from '../../components/common/FileDropzone'
import { useUI } from '../../context/UIContext'
import { fetchCases, uploadDocument } from '../../api/realApi'

export default function PoliceUpload() {
  const [searchParams] = useSearchParams()
  const [cases, setCases] = useState([])
  const [file, setFile] = useState(null)
  const [caseId, setCaseId] = useState(searchParams.get('caseId') || '')
  const [docType, setDocType] = useState(searchParams.get('category') || 'FIR')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      pushToast({ type: 'error', title: 'Please attach a document file' })
      return
    }
    if (!caseId) {
      pushToast({ type: 'error', title: 'Please select an active case docket' })
      return
    }
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title || file.name)
      formData.append('case', caseId)
      formData.append('category', docType)
      formData.append('classification', 'CONFIDENTIAL')
      if (description) formData.append('description', description)

      await uploadDocument(formData)
      pushToast({ type: 'success', title: 'Document uploaded & cryptographically sealed', message: `${file.name} added to case` })
      navigate('/police/documents')
    } catch (err) {
      pushToast({ type: 'error', title: 'Upload failed', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Upload & Seal Case Document" subtitle="Attach and record a new digital evidence or police document" />
      <form onSubmit={handleSubmit} className="card p-5 max-w-lg space-y-4">
        <FileDropzone file={file} onFileSelected={setFile} maxSizeMb={50} accept=".pdf,.doc,.docx,.jpg,.png,.mp4" />

        <div>
          <label className="label">Select Case Docket</label>
          <select value={caseId} onChange={(e) => setCaseId(e.target.value)} required className="input">
            <option value="">-- Select Case Docket --</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number || c.id} — {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Document Category</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} required className="input">
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

        {docType === 'FIR' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-800">
            <strong>Direct FIR Intake:</strong> Official FIR documents are directly validated and anchored into the cryptographic ledger — no prior approval required.
          </div>
        )}

        <div>
          <label className="label">Document Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="input"
            placeholder="e.g. Complainant Statement & Audio Transcript"
          />
        </div>

        <div>
          <label className="label">Description / Remarks (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="Enter officer notes or seizure details…"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
            {submitting ? 'Sealing & Uploading…' : 'Upload & Hash Seal'}
          </button>
        </div>
      </form>
    </div>
  )
}
