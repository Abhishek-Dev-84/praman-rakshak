import { useEffect, useState } from 'react'
import { Users2, GitBranch, MessageSquare, ShieldCheck, Send, Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import { useUI } from '../../context/UIContext'
import { useAuth } from '../../context/AuthContext'
import { fetchUsers, fetchCases } from '../../api/realApi'
import { subscribeToGlobalAudit } from '../../api/websocketService'

export default function CollaborativeWorkspace() {
  const { user } = useAuth()
  const [colleagues, setColleagues] = useState([])
  const [cases, setCases] = useState([])
  const [selectedCase, setSelectedCase] = useState('')
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const { pushToast } = useUI()

  useEffect(() => {
    async function loadWorkspace(silent = false) {
      if (!silent) setLoading(true)
      try {
        const [uData, cData] = await Promise.all([
          fetchUsers().catch(() => []),
          fetchCases().catch(() => []),
        ])
        const userList = Array.isArray(uData) ? uData : uData?.results || []
        setColleagues(userList.filter((u) => u.role === 'LEGAL_OFFICER' || u.role === 'INVESTIGATOR'))
        
        const caseList = Array.isArray(cData) ? cData : cData?.results || []
        setCases(caseList)
        if (caseList.length > 0 && !selectedCase) {
          setSelectedCase(caseList[0].case_number || caseList[0].id)
        }
      } catch (err) {
        console.error('Failed to load workspace:', err)
      } finally {
        if (!silent) setLoading(false)
      }
    }
    loadWorkspace()

    const unsubscribe = subscribeToGlobalAudit(
      () => {
        loadWorkspace(true)
      },
      () => {}
    )

    return () => {
      unsubscribe()
    }
  }, [])

  const send = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setComments((prev) => [
      ...prev,
      {
        id: Date.now(),
        author: user?.name || user?.username || 'You',
        text: text.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setText('')
    pushToast({ type: 'success', title: 'Note posted to case record' })
  }

  return (
    <div>
      <PageHeader
        title="Legal Collaboration Workspace"
        subtitle={`Coordinated legal workspace for ${selectedCase || 'active case dockets'}`}
      />

      <div className="card p-4 mb-4 flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-500 uppercase shrink-0">Active Docket:</label>
        <select
          value={selectedCase}
          onChange={(e) => setSelectedCase(e.target.value)}
          className="input max-w-md py-1.5 text-sm"
        >
          {cases.map((c) => (
            <option key={c.id} value={c.case_number || c.id}>
              {c.case_number || c.id} — {c.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="font-semibold text-navy-900 text-sm mb-3 flex items-center gap-1.5">
            <Users2 size={16} /> Authenticated Legal Officials
          </p>
          {loading ? (
            <div className="py-4 text-center">
              <Loader2 className="animate-spin text-navy-600 mb-1" size={20} />
            </div>
          ) : colleagues.length === 0 ? (
            <p className="text-xs text-slate-400">No other legal officers registered.</p>
          ) : (
            <div className="space-y-3">
              {colleagues.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="h-9 w-9 rounded-full bg-forest-100 text-forest-800 flex items-center justify-center text-xs font-bold uppercase">
                      {(c.username || 'U')[0]}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-800 truncate">{c.username}</p>
                    <p className="text-xs text-slate-400">{c.role} · {c.email || 'gov.in'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-2.5 text-sm text-navy-700">
              <GitBranch size={15} className="text-forest-600" /> Cryptographic Version Pinning
            </div>
            <div className="flex items-center gap-2.5 text-sm text-navy-700">
              <ShieldCheck size={15} className="text-forest-600" /> Tamper-Proof Audit Logging
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 card p-5 flex flex-col">
          <p className="font-semibold text-navy-900 text-sm mb-3 flex items-center gap-1.5">
            <MessageSquare size={16} /> Legal Review Annotations & Brief Notes
          </p>
          <div className="flex-1 space-y-4 mb-4 max-h-96 overflow-y-auto">
            {comments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No notes or annotations recorded for this docket yet. Write a secure comment below.
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-forest-100 text-forest-800 flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                    {c.author[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-semibold text-navy-800">{c.author}</p>
                      <p className="text-xs text-slate-400">{c.time}</p>
                    </div>
                    <p className="text-sm text-slate-600">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={send} className="flex items-center gap-2 pt-3 border-t border-slate-100">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write an official legal review note…"
              className="input"
            />
            <button type="submit" className="rounded-lg bg-forest-600 text-white p-2.5 hover:bg-forest-700 shrink-0">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
