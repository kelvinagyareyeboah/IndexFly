interface Props {
  onSelect: (q: string) => void
}

const hints = [
  { label: 'distributed systems', desc: 'ranked' },
  { label: 'machine AND learning', desc: 'AND' },
  { label: 'database OR golang', desc: 'OR' },
  { label: 'security AND NOT SQL', desc: 'AND NOT' },
]

export default function QueryHints({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {hints.map(h => (
        <button
          key={h.label}
          onClick={() => onSelect(h.label)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs
                     border border-[#1e1e2e] bg-[#111118] text-slate-500
                     hover:border-violet-700/60 hover:text-violet-400
                     transition-all duration-150"
        >
          <span>{h.label}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-[#1e1e2e] text-[10px] text-slate-600 font-mono">
            {h.desc}
          </span>
        </button>
      ))}
    </div>
  )
}
