import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function Register() {
  const { register, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // All hooks must be declared before any conditional return
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    org_name: '',
    role: 'investigator',
    department: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Already logged in — redirect away from register page
  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        org_name: form.org_name,
        role: form.role,
        department: form.department || undefined,
      })
      toast.success('Account created! Welcome to SceneSolver.')
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">SceneSolver</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-6">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Register your organization</p>
        </div>

        <div className="card">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text" name="name" required
                  value={form.name} onChange={handleChange}
                  placeholder="John Smith"
                  className="input-field" disabled={submitting}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                <input
                  type="text" name="org_name" required
                  value={form.org_name} onChange={handleChange}
                  placeholder="Metro Police Department"
                  className="input-field" disabled={submitting}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email" name="email" required autoComplete="email"
                  value={form.email} onChange={handleChange}
                  placeholder="john@agency.gov"
                  className="input-field" disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="role" value={form.role} onChange={handleChange}
                  className="input-field" disabled={submitting}
                >
                  <option value="investigator">Investigator</option>
                  <option value="org_admin">Org Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text" name="department"
                  value={form.department} onChange={handleChange}
                  placeholder="Homicide"
                  className="input-field" disabled={submitting}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} name="password" required
                    autoComplete="new-password"
                    value={form.password} onChange={handleChange}
                    placeholder="Min. 8 characters"
                    className="input-field pr-10" disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 mt-2">
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
