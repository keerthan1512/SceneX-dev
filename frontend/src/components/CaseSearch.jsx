import { useState, useEffect } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { CRIME_TYPES, CASE_STATUSES, STATUS_LABELS } from '../utils/constants'

export default function CaseSearch({ onSearch }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [crimeType, setCrimeType] = useState('')

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => {
      onSearch({ search: search || undefined, status: status || undefined, crime_type: crimeType || undefined, page: 1 })
    }, 350)
    return () => clearTimeout(t)
  }, [search, status, crimeType])

  const clearAll = () => {
    setSearch('')
    setStatus('')
    setCrimeType('')
  }

  const hasFilters = search || status || crimeType

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by Case ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="input-field w-auto"
      >
        <option value="">All Statuses</option>
        {CASE_STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>
      <select
        value={crimeType}
        onChange={(e) => setCrimeType(e.target.value)}
        className="input-field w-auto"
      >
        <option value="">All Crime Types</option>
        {CRIME_TYPES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      {hasFilters && (
        <button onClick={clearAll} className="btn-secondary flex items-center gap-1.5 whitespace-nowrap">
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}
    </div>
  )
}
