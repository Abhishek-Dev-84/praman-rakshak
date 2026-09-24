import { useRef, useState } from 'react'
import { UploadCloud, File as FileIcon, X } from 'lucide-react'

export default function FileDropzone({ file, onFileSelected, accept = '.pdf,.doc,.docx,.jpg,.png,.mp4', maxSizeMb = 50, hint }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (files) => {
    if (files && files[0]) onFileSelected(files[0])
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-navy-500 bg-navy-50' : 'border-slate-300 hover:border-navy-300 bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileIcon className="text-navy-600" size={28} />
            <div className="text-left">
              <p className="font-semibold text-navy-800 text-sm">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFileSelected(null)
              }}
              className="rounded-full p-1 hover:bg-slate-200 text-slate-500"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="mx-auto text-slate-400 mb-2" size={32} />
            <p className="text-sm font-semibold text-navy-700">Drag &amp; drop files here</p>
            <p className="text-xs text-slate-400 mt-1">or</p>
            <span className="btn-outline btn-sm mt-2 inline-flex">Browse Files</span>
          </>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-2">
        {hint || `Max file size: ${maxSizeMb} MB. Allowed formats: ${accept.replaceAll('.', ' ').trim()}`}
      </p>
    </div>
  )
}
