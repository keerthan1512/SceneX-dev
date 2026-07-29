import { useEffect, useState } from 'react'
import { UserPlus, ToggleLeft, ToggleRight, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { formatDate } from '../utils/formatters'

export default function Admin() {
  const { user } = useAuth()
  const [investigators, setInvestigators] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchInvestigators = async () => {
    try {
      const res = await adminAPI.listInvestigators()
      setInvestigators(res.data)
    } catch {
      toast.error('Failed to load investigators')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInvestigators() }, [])

  const handleToggleActive = async (inv) => {
    try {
      await adminAPI.updateInvestigator(inv.id, { is_active: !inv.is_active })
      setInvestigators(prev => prev.map(i => i.id === inv.id ? { ...i, is_active: !i.is_active } : i))
      toast.success(`${inv.name} ${inv.is_active ? 'deactivated' : 'activated'}`)
    } catch {
      toast.error('Failed to update investigator')
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setSaving(true)
    try {
      await adminAPI.addInvestigator(form)
      toast.success(`${form.name} added successfully`)
      setForm({ name: '', email: '', password: '', department: '' })
      setShowAdd(false)
      fetchInvestigators()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add investigator')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user?.org_name} · Investigators</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Add Investigator
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Add New Investigator</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">{error}</div>
          )}
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input-field" placeholder="Jane Doe" disabled={saving} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-field" placeholder="jane@agency.gov" disabled={saving} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className="input-field" placeholder="Homicide" disabled={saving} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
              <input type="password" required value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input-field" placeholder="Min. 8 chars" disabled={saving} />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Adding...' : 'Add Investigator'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Investigator</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Department</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Joined</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="py-3 px-4">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : investigators.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400 text-sm">No investigators yet</td>
              </tr>
            ) : (
              investigators.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                        {inv.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{inv.name}</p>
                        <p className="text-xs text-gray-400">{inv.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 hidden sm:table-cell">{inv.department || '—'}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs flex items-center gap-1 text-gray-600 capitalize">
                      {inv.role === 'org_admin' && <Shield className="w-3.5 h-3.5 text-blue-600" />}
                      {inv.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden md:table-cell">{formatDate(inv.created_at)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${inv.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {inv.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {inv.id !== user?.id && (
                      <button
                        onClick={() => handleToggleActive(inv)}
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                        title={inv.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {inv.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
