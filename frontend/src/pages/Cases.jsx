import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Upload, Eye } from 'lucide-react'
import { useCases } from '../hooks/useCases'
import CaseSearch from '../components/CaseSearch'
import RiskBadge from '../components/RiskBadge'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatConfidence } from '../utils/formatters'

export default function Cases() {
  const { cases, total, totalPages, loading, error, fetchCases } = useCases()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({})

  useEffect(() => {
    fetchCases({ page, ...filters })
  }, [page, filters, fetchCases])

  const handleSearch = (newFilters) => {
    setPage(1)
    setFilters(newFilters)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total cases</p>
        </div>
        <Link to="/cases/upload" className="btn-primary flex items-center gap-2">
          <Upload className="w-4 h-4" /> New Case
        </Link>
      </div>

      <CaseSearch onSearch={handleSearch} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Case ID</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Crime Type</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Date</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="py-3 px-4">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : cases.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  <p className="text-sm">No cases found</p>
                  <Link to="/cases/upload" className="text-blue-600 text-sm hover:underline mt-1 inline-block">
                    Upload your first scene
                  </Link>
                </td>
              </tr>
            ) : (
              cases.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <Link to={`/cases/${c.case_id}`} className="font-semibold text-blue-700 hover:underline text-sm">
                      {c.case_id}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{c.investigator_name}</p>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <span className="text-sm text-gray-700">{c.crime_type || <span className="text-gray-300">Analyzing...</span>}</span>
                    {c.crime_confidence && (
                      <span className="text-xs text-gray-400 ml-1.5">{formatConfidence(c.crime_confidence)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <RiskBadge level={c.risk_level} score={c.risk_score} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden md:table-cell">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <Link to={`/cases/${c.case_id}`} className="text-gray-400 hover:text-blue-600 transition-colors">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary p-2 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary p-2 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
