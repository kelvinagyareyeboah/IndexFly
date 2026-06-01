import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  page: number
  pages: number
  onPage: (p: number) => void
}

export default function Pagination({ page, pages, onPage }: Props) {
  if (pages <= 1) return null

  // Build page number list with ellipsis
  const nums: (number | '…')[] = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
      nums.push(i)
    } else if (nums[nums.length - 1] !== '…') {
      nums.push('…')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg border border-[#1e1e2e] text-slate-500 hover:border-violet-700/60
                   hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft size={16} />
      </button>

      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-slate-600 text-sm">…</span>
        ) : (
          <button
            key={n}
            onClick={() => onPage(n)}
            className={clsx(
              'w-9 h-9 rounded-lg text-sm font-medium border transition-all',
              n === page
                ? 'border-violet-600 bg-violet-950/50 text-violet-300'
                : 'border-[#1e1e2e] text-slate-500 hover:border-violet-700/60 hover:text-violet-400'
            )}
          >
            {n}
          </button>
        )
      )}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page === pages}
        className="p-2 rounded-lg border border-[#1e1e2e] text-slate-500 hover:border-violet-700/60
                   hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
