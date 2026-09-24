import { useState } from 'react'
import { Sparkles, FileText, Bot, Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/common/Controls'
import { EmptyState } from '../../components/common/States'
import { semanticSearch } from '../../api/realApi'

export default function JudgeSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const runSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await semanticSearch(query)
      setResults(res)
    } catch (err) {
      console.error('Semantic search failed:', err)
      setResults({ answer: 'Search request could not be completed.', sources: [] })
    } finally {
      setLoading(false)
    }
  }

  const sources = results?.sources || []

  return (
    <div>
      <PageHeader
        title="AI-Powered Semantic Case Search"
        subtitle="Natural language retrieval and citation-grounded answers over permitted judicial case dockets"
      />

      <form onSubmit={runSearch} className="card p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Sparkles size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask an investigative question e.g. What forensic evidence was recovered from the vehicle?…"
            className="input pl-9"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-gold shrink-0">
          {loading ? <Loader2 className="animate-spin" size={16} /> : null}
          {loading ? 'Analyzing…' : 'Search Repository'}
        </button>
      </form>

      {loading ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-navy-600 mb-2" size={28} />
          <p className="text-sm text-slate-500">Querying vector index & generating grounded AI response…</p>
        </div>
      ) : !searched ? (
        <div className="card p-8 text-center text-slate-400 text-sm">
          Enter an investigative or legal question above to search across case files with cryptographic source citations.
        </div>
      ) : (
        <div className="space-y-4">
          {results?.answer && (
            <div className="card p-5 bg-navy-900 text-white border-none">
              <div className="flex items-center gap-2 mb-2 text-gold-400 text-xs font-bold uppercase tracking-wider">
                <Bot size={16} /> Grounded AI Analysis
              </div>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{results.answer}</p>
            </div>
          )}

          {sources.length === 0 ? (
            <EmptyState title="No matching passages found" description="Try refining your query terms or searching for a specific case docket." />
          ) : (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Cited Document Sources ({sources.length})</p>
              <div className="space-y-3">
                {sources.map((r, idx) => (
                  <div key={idx} className="card p-4 flex items-start gap-3 hover:border-navy-300 border border-transparent transition">
                    <div className="rounded-lg bg-navy-50 p-2.5 text-navy-600 shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-navy-900 text-sm">{r.title || 'Case Document'}</p>
                        <span className="text-xs font-bold text-emerald-600 shrink-0">
                          Relevance: {(Number(r.relevance_score || 0.85) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{r.snippet}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
