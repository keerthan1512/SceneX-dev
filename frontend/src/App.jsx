import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Cases from './pages/Cases'
import CaseDetail from './pages/CaseDetail'
import Admin from './pages/Admin'
import Classify from './pages/Classify'

// Redirects authenticated users to /dashboard, guests to /
function AuthAwareRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Navigate to={user ? '/dashboard' : '/'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/upload"
          element={
            <ProtectedRoute>
              <Layout><Upload /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases"
          element={
            <ProtectedRoute>
              <Layout><Cases /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/:caseId"
          element={
            <ProtectedRoute>
              <Layout><CaseDetail /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin only */}
        <Route
          path="/admin/investigators"
          element={
            <ProtectedRoute adminOnly>
              <Layout><Admin /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/classify"
          element={
            <ProtectedRoute>
              <Layout><Classify /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Fallback — send authenticated users to dashboard, guests to landing */}
        <Route path="*" element={<AuthAwareRedirect />} />
      </Routes>
    </AuthProvider>
  )
}
