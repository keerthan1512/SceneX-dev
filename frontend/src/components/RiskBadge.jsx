import clsx from 'clsx'

const RISK_STYLES = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  critical: 'bg-purple-100 text-purple-800',
}

export default function RiskBadge({ level, score, size = 'sm' }) {
  if (!level) return <span className="text-gray-400 text-xs">Pending</span>

  return (
    <span className={clsx(
      'inline-flex items-center gap-1 font-semibold rounded-full',
      size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1',
      RISK_STYLES[level.toLowerCase()] || 'bg-gray-100 text-gray-700'
    )}>
      {score != null && <span className="font-bold">{score}</span>}
      <span className="capitalize">{level}</span>
    </span>
  )
}
