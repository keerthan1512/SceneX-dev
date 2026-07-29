import { useState, useCallback } from 'react'
import { casesAPI } from '../services/api'

export function useCases() {
  const [cases, setCases] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCases = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const res = await casesAPI.list(params)
      setCases(res.data.cases)
      setTotal(res.data.total)
      setTotalPages(res.data.total_pages)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load cases')
    } finally {
      setLoading(false)
    }
  }, [])

  return { cases, total, totalPages, loading, error, fetchCases }
}

export function useCaseDetail(caseId) {
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCase = useCallback(async () => {
    if (!caseId) return
    setLoading(true)
    setError(null)
    try {
      const res = await casesAPI.get(caseId)
      setCaseData(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load case')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  return { caseData, loading, error, fetchCase, setCaseData }
}
