export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatConfidence(val) {
  if (val == null) return '—'
  return `${(val * 100).toFixed(1)}%`
}

export function formatRiskLevel(level) {
  if (!level) return '—'
  return level.charAt(0).toUpperCase() + level.slice(1)
}

export function formatStatus(status) {
  if (!status) return '—'
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
