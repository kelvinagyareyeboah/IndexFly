import { useRef, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../api'

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: (q: string) => void
  loading: boolean
  compact?: boolean
}

export default function SearchBar({ value, onChange, onSubmit, loading, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Global "/" shortcut to focus
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Fetch autocomplete suggestions debounced
  useEffect(() => {
    clearTimeout(debounceRef.current)
    const lastWord = value.trim().split(/\s+/).pop() ?? ''
    if (lastWord.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(api(`/api/autocomplete?q=${encodeURIComponent(lastWord)}`))
        const data: string[] = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
        setActiveIdx(-1)
      } catch {
        setSuggestions([])
      }
    }, 180)
  }, [value])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q) return
    setOpen(false)
    setSuggestions([])
    onSubmit(q)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      applySuggestion(suggestions[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function applySuggestion(term: string) {
    // Replace the last word in the input with the suggestion
    const words = value.trimEnd().split(/\s+/)
    words[words.length - 1] = term
    const next = words.join(' ')
    onChange(next)
    setOpen(false)
    setSuggestions([])
    inputRef.current?.focus()
  }

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div
          className={clsx(
            'flex items-center gap-3 w-full rounded-2xl border transition-all duration-200',
            'bg-[#111118] border-[#1e1e2e]',
            'focus-within:border-violet-600 focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]',
            compact ? 'px-4 py-3' : 'px-5 py-4'
          )}
        >
          <Search
            size={compact ? 18 : 20}
            className={clsx('shrink-0 transition-colors', loading ? 'text-violet-400 animate-pulse' : 'text-slate-500')}
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Search anything…"
            autoComplete="off"
            spellCheck={false}
            className={clsx(
              'flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-600',
              compact ? 'text-sm' : 'text-base'
            )}
          />
          {value && (
            <button
              type="button"
              onClick={() => { onChange(''); setSuggestions([]); setOpen(false) }}
              className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:flex shrink-0 items-center px-2 py-0.5 rounded border border-[#1e1e2e] text-[10px] text-slate-600 font-mono">
            /
          </kbd>
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full mt-1.5 w-full rounded-xl border border-[#1e1e2e] bg-[#111118]
                        shadow-xl shadow-black/40 overflow-hidden">
          {suggestions.map((s, i) => (
            <li
              key={s}
              onMouseDown={() => applySuggestion(s)}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors',
                i === activeIdx
                  ? 'bg-violet-950/60 text-violet-300'
                  : 'text-slate-400 hover:bg-[#1a1a28] hover:text-slate-200'
              )}
            >
              <Search size={12} className="text-slate-600 shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
