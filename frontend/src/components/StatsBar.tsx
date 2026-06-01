import { Database, Hash, Clock } from 'lucide-react'

interface Props {
  docs: number
  terms: number
  elapsed?: number
  total?: number
}

export default function StatsBar({ docs, terms, elapsed, total }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
      <span className="flex items-center gap-1.5">
        <Database size={11} />
        {docs} docs
      </span>
      <span className="flex items-center gap-1.5">
        <Hash size={11} />
        {terms.toLocaleString()} terms
      </span>
      {elapsed !== undefined && (
        <span className="flex items-center gap-1.5">
          <Clock size={11} />
          {elapsed}ms
        </span>
      )}
      {total !== undefined && (
        <span className="text-slate-500">
          {total} result{total !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
