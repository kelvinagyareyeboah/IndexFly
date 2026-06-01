import { FileText } from 'lucide-react'
import type { SearchResult } from '../types'

interface Props {
  result: SearchResult
  rank: number
  query: string
}

function highlight(text: string, query: string): string {
  const terms = query
    .replace(/\b(AND NOT|AND|OR)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!terms.length) return text

  const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return text.replace(pattern, '<mark class="bg-violet-500/25 text-violet-300 rounded px-0.5">$1</mark>')
}

export default function ResultCard({ result, rank, query }: Props) {
  const isBoolean = result.score === 1.0
  const docLabel = result.name.replace('.txt', '').replace(/[-_]/g, ' ')

  return (
    <div
      className="group flex gap-4 p-5 rounded-2xl border border-[#1e1e2e] bg-[#13131c]
                 hover:border-violet-700/60 hover:bg-[#16161f] transition-all duration-200
                 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${rank * 40}ms`, animationFillMode: 'both' }}
    >
      {/* Rank */}
      <span className="text-xs text-slate-700 font-bold pt-0.5 w-5 shrink-0 select-none">
        {rank}
      </span>

      {/* Icon */}
      <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-violet-950/50 border border-violet-900/40
                      flex items-center justify-center">
        <FileText size={14} className="text-violet-400" />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 capitalize tracking-wide">
          {docLabel}
        </p>
        <p
          className="mt-1 text-sm text-slate-500 leading-relaxed line-clamp-2"
          dangerouslySetInnerHTML={{ __html: highlight(result.snippet, query) }}
        />
      </div>

      {/* Score badge */}
      <div className="shrink-0 self-start">
        {isBoolean ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                           bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
            MATCH
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                           bg-violet-950/60 text-violet-400 border border-violet-900/50 font-mono">
            {result.score.toFixed(3)}
          </span>
        )}
      </div>
    </div>
  )
}
