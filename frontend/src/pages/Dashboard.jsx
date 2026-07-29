import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, AlertTriangle, TrendingUp, Upload, ExternalLink } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { useAuth } from '../hooks/useAuth'
import { CrimeDistributionChart, RiskDistributionChart, EvidenceStatsChart } from '../components/DashboardCharts'
import RiskBadge from '../components/RiskBadge'
import StatusBadge from '../components/StatusBadge'
import { formatDate } from '../utils/formatters'

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { stats, loading, fetchStats } = useDashboard()

  useEffect(() => { fetchStats() }, [fetchStats])

  const criticalCount = stats?.risk_distribution?.critical || 0
  const highCount = stats?.risk_distribution?.high || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">{user?.org_name}</p>
        </div>
        <Link to="/cases/upload" className="btn-primary flex items-center gap-2">
          <Upload className="w-4 h-4" /> New Case
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse h-24 bg-gray-50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={FolderOpen}
            label="Total Cases"
            value={stats?.total_cases ?? 0}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={AlertTriangle}
            label="Critical Risk"
            value={criticalCount}
            color="bg-purple-50 text-purple-600"
            sub={`${highCount} high risk`}
          />
          <StatCard
            icon={TrendingUp}
            label="Under Investigation"
            value={stats?.status_distribution?.under_investigation ?? 0}
            color="bg-orange-50 text-orange-600"
            sub={`${stats?.status_distribution?.open ?? 0} open`}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Crime Type Distribution</h2>
          <CrimeDistributionChart data={stats?.crime_distribution || []} />
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Risk Level Distribution</h2>
          <RiskDistributionChart data={stats?.risk_distribution || {}} />
        </div>
      </div>

      {/* Evidence + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Top Detected Evidence</h2>
          <EvidenceStatsChart data={stats?.evidence_stats || []} />
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Cases</h2>
            <Link to="/cases" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {!stats?.recent_cases?.length ? (
            <p className="text-sm text-gray-400 text-center py-6">No cases yet</p>
          ) : (
            <div className="space-y-2">
              {stats.recent_cases.map((c) => (
                <Link
                  key={c.case_id}
                  to={`/cases/${c.case_id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{c.case_id}</p>
                    <p className="text-xs text-gray-400">{c.crime_type || 'Analyzing...'} · {formatDate(c.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={c.risk_level} />
                    <StatusBadge status={c.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
