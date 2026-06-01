import { useState, useCallback, useEffect, useRef } from 'react'
import { RefreshCw, Zap } from 'lucide-react'
import SearchBar from './components/SearchBar'
import ResultCard from './components/ResultCard'
import QueryHints from './components/QueryHints'
import StatsBar from './components/StatsBar'
import Pagination from './components/Pagination'
import type { SearchResponse, StatsResponse } from './types'

const LIMIT = 10

export default function App() {
  const [query, setQuery] = useState('')
  const [input, setInput] = useState('')
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState<number | undefined>()
  const [reindexing, setReindexing] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Load stats on mount
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3000)
  }, [])

  const doSearch = useCallback(async (q: string, page = 1) => {
    if (!q.trim()) return
    setLoading(true)
    setQuery(q)
    const t0 = performance.now()
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&page=${page}&limit=${LIMIT}`
      )
      const data: SearchResponse = await res.json()
      setElapsed(Math.round(performance.now() - t0))
      setResponse(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      showToast('Search failed — is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  // Debounced live search as user types
  const handleInputChange = useCallback((v: string) => {
    setInput(v)
    clearTimeout(debounceRef.current)
    if (!v.trim()) return
    debounceRef.current = setTimeout(() => doSearch(v), 350)
  }, [doSearch])

  const handleSubmit = useCallback((q: string) => {
    setInput(q)
    doSearch(q)
  }, [doSearch])

  const doReindex = useCallback(async () => {
    setReindexing(true)
    try {
      const res = await fetch('/api/reindex')
      const data = await res.json()
      setStats({ docs: data.docs, terms: data.terms, avg_dl: 0 })
      showToast(`✓ Indexed ${data.docs} docs · ${data.terms} terms`)
    } catch {
      showToast('Reindex failed')
    } finally {
      setReindexing(false)
    }
  }, [showToast])

  const handleReset = () => {
    setResponse(null)
    setInput('')
    setQuery('')
    setElapsed(undefined)
  }

  const isHome = response === null && !loading

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── STICKY TOP NAV (results state) ── */}
      {!isHome && (
        <header className="sticky top-0 z-20 border-b border-[#1e1e2e] bg-[#0a0a0f]/90 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
            <button
              onClick={handleReset}
              className="text-lg font-black tracking-tight bg-gradient-to-r from-violet-400 to-purple-400
                         bg-clip-text text-transparent shrink-0 hover:opacity-80 transition-opacity"
            >
              IndexFly
            </button>
            <div className="flex-1">
              <SearchBar
                value={input}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                loading={loading}
                compact
              />
            </div>
            <button
              onClick={doReindex}
              disabled={reindexing}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                         border border-[#1e1e2e] text-slate-500 hover:border-violet-700/60
                         hover:text-violet-400 transition-all disabled:opacity-40"
            >
              <RefreshCw size={12} className={reindexing ? 'animate-spin' : ''} />
              Reindex
            </button>
          </div>
        </header>
      )}

      {/* ── HOME STATE ── */}
      {isHome && (
        <main className="flex-1 flex flex-col items-center justify-center px-4 pb-24">
          <div className="w-full max-w-2xl flex flex-col items-center gap-8">

            <div className="text-center">
              <h1 className="text-6xl font-black tracking-tight bg-gradient-to-br from-white via-slate-200 to-violet-400
                             bg-clip-text text-transparent select-none">
                IndexFly
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Custom Full-Text Search Engine &amp; Web Crawler · Go + React
              </p>
            </div>

            <div className="w-full">
              <SearchBar
                value={input}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                loading={loading}
              />
            </div>

            <QueryHints onSelect={q => { setInput(q); doSearch(q) }} />

            {stats && (
              <StatsBar docs={stats.docs} terms={stats.terms} />
            )}
          </div>
        </main>
      )}

      {/* ── RESULTS STATE ── */}
      {!isHome && (
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">

          {/* Stats row */}
          {stats && response && (
            <div className="mb-5">
              <StatsBar
                docs={stats.docs}
                terms={stats.terms}
                elapsed={elapsed}
                total={response.total}
              />
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl border border-[#1e1e2e] bg-[#13131c] animate-pulse" />
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && response && (
            <>
              {response.results.length > 0 ? (
                <>
                  <div className="flex flex-col gap-3">
                    {response.results.map((r, i) => (
                      <ResultCard
                        key={r.doc_id}
                        result={r}
                        rank={(response.page - 1) * LIMIT + i + 1}
                        query={query}
                      />
                    ))}
                  </div>
                  <Pagination
                    page={response.page}
                    pages={response.pages}
                    onPage={p => doSearch(query, p)}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-600">
                  <Zap size={32} className="text-slate-700" />
                  <p className="text-sm">
                    No results for <span className="text-slate-400">"{query}"</span>
                  </p>
                  <p className="text-xs text-slate-700">
                    Try different terms or check your boolean operators
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* ── TOAST ── */}
      <div
        className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl text-sm
                    border border-violet-800/60 bg-[#111118] text-violet-300
                    transition-all duration-300 pointer-events-none
                    ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      >
        {toast}
      </div>
    </div>
  )
}
