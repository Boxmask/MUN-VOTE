import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import { searchCountries } from '../data/countries'
import './CountrySuggest.css'

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  maxLength: number
  placeholder?: string
  autoFocus?: boolean
}

export function CountrySuggest({
  id,
  value,
  onChange,
  maxLength,
  placeholder,
  autoFocus,
}: Props) {
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const suggestions = searchCountries(value, 8)

  useEffect(() => {
    setActive(0)
  }, [value])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function pick(name: string) {
    onChange(name)
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && suggestions[active]) {
      e.preventDefault()
      pick(suggestions[active].name)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="country-suggest" ref={wrapRef}>
      <input
        id={id}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && suggestions.length > 0 && (
        <ul id={listId} className="country-suggest-list" role="listbox">
          {suggestions.map((c, i) => (
            <li key={c.alpha2 + c.name} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={i === active ? 'is-active' : undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(c.name)}
              >
                <span>{c.name}</span>
                <small>{c.alpha2}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
