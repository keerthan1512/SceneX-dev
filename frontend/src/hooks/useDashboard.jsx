import { useState, useCallback } from 'react'
import { dashboardAPI } from '../services/api'

export function useDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await dashboardAPI.stats()
      setStats(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  return { stats, loading, error, fetchStats }
}
