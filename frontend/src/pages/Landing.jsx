import { Link, Navigate } from 'react-router-dom'
import { Shield, Brain, FileText, Users, ChevronRight, Eye, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const features = [
  {
    icon: Brain,
    title: 'AI Crime Classification',
    desc: 'CLIP model trained on real crime scenes classifies 10 categories with confidence scoring.',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    icon: Eye,
    title: 'Evidence Detection',
    desc: 'YOLOv8 detects 11 evidence classes — guns, knives, blood, masks, and more — with bounding boxes.',
    color: 'text-orange-600 bg-orange-50',
  },
  {
    icon: AlertTriangle,
    title: 'Risk Assessment',
    desc: 'Weighted risk engine computes a 0–100 score across Low, Medium, High, and Critical levels.',
    color: 'text-red-600 bg-red-50',
  },
  {
    icon: Brain,
    title: 'LLM Reasoning',
    desc: 'Groq LLM generates probabilistic crime narratives, event timelines, and investigation recommendations.',
    color: 'text-purple-600 bg-purple-50',
  },
  {
    icon: FileText,
    title: 'PDF Reports',
    desc: 'Auto-generated 10-section forensic reports with annotated images, evidence tables, and AI summaries.',
    color: 'text-green-600 bg-green-50',
  },
  {
    icon: Users,
    title: 'Multi-org Case Management',
    desc: 'Isolated per-organization case records with 2-year retention and full investigator note history.',
    color: 'text-indigo-600 bg-indigo-50',
  },
]

const roles = [
  { role: 'Guest', perms: ['View landing page', 'Browse features'] },
  { role: 'Investigator', perms: ['Upload crime scenes', 'View & download reports', 'Add investigation notes', 'Manage own cases'] },
  { role: 'Org Admin', perms: ['All investigator access', 'Organization dashboard', 'Manage investigators', 'Access all org cases', 'Delete archived cases'] },
]

export default function Landing() {
  const { user, loading } = useAuth()

  // If already authenticated, skip the landing page entirely
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <span className="font-bold text-gray-900 text-lg">SceneSolver</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          AI-Powered Crime Scene Analysis · Phase 1
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight mb-5">
          Crime Scene Intelligence,
          <span className="text-blue-700"> Automated</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload a scene image. SceneSolver classifies the crime, detects evidence, 
          assesses risk, and generates a full forensic PDF report — in under 30 seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register" className="btn-primary flex items-center justify-center gap-2 text-base px-6 py-3">
            Start Investigating <ChevronRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="btn-secondary flex items-center justify-center gap-2 text-base px-6 py-3">
            Sign In
          </Link>
        </div>
      </section>

      {/* Pipeline */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">6-Step Analysis Pipeline</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { step: 1, label: 'Crime Classification', sub: 'CLIP Model' },
              { step: 2, label: 'Evidence Detection', sub: 'YOLOv8' },
              { step: 3, label: 'Statistics', sub: 'Aggregation' },
              { step: 4, label: 'AI Reasoning', sub: 'Groq LLM' },
              { step: 5, label: 'Risk Score', sub: 'Engine' },
              { step: 6, label: 'PDF Report', sub: 'ReportLab' },
            ].map(({ step, label, sub }) => (
              <div key={step} className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm">
                <div className="w-8 h-8 bg-blue-700 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2">
                  {step}
                </div>
                <p className="text-xs font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Capabilities</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">User Roles</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {roles.map(({ role, perms }) => (
              <div key={role} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 pb-3 border-b border-gray-50">{role}</h3>
                <ul className="space-y-2">
                  {perms.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>SceneSolver — AI-Powered Crime Scene Investigation Assistant · Phase 1 v1.0 · June 2026</p>
        <p className="mt-1 text-xs">All AI outputs are probabilistic and advisory. Not a legal determination.</p>
      </footer>
    </div>
  )
}
