import clsx from 'clsx'

const STATUS_STYLES = {
  open: 'bg-blue-100 text-blue-800',
  under_investigation: 'bg-orange-100 text-orange-800',
  closed: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS = {
  open: 'Open',
  under_investigation: 'Under Investigation',
  closed: 'Closed',
}

export default function StatusBadge({ status }) {
  if (!status) return null
  return (
    <span className={clsx(
      'inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full',
      STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
    )}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}
