import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, RefreshCw, ArrowLeft, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCaseDetail } from '../hooks/useCases'
import { useAuth } from '../hooks/useAuth'
import { casesAPI } from '../services/api'
import RiskBadge from '../components/RiskBadge'
import StatusBadge from '../components/StatusBadge'
import EvidenceTable from '../components/EvidenceTable'
import NoteEditor from '../components/NoteEditor'
import { formatDateTime, formatConfidence } from '../utils/formatters'
import { CASE_STATUSES, STATUS_LABELS } from '../utils/constants'

function Section({ title, children, icon: Icon }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
        {Icon && <Icon className="w-4 h-4 text-blue-600" />}
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function CaseDetail() {
  const { caseId } = useParams()
  const { user } = useAuth()
  const { caseData, loading, error, fetchCase, setCaseData } = useCaseDetail(caseId)
  const [downloading, setDownloading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    fetchCase()
  }, [fetchCase])

  // Poll until analysis is complete
  useEffect(() => {
    if (!caseData) return
    if (!caseData.analysis_completed_at && !caseData.analysis_failed) {
      setPolling(true)
      const interval = setInterval(async () => {
        try {
          const res = await casesAPI.get(caseId)
          setCaseData(res.data)
          if (res.data.analysis_completed_at || res.data.analysis_failed) {
            clearInterval(interval)
            setPolling(false)
          }
        } catch {}
      }, 4000)
      return () => clearInterval(interval)
    } else {
      setPolling(false)
    }
  }, [caseData?.analysis_completed_at, caseData?.analysis_failed, caseId])

  const handleDownloadReport = async () => {
    setDownloading(true)
    try {
      const res = await casesAPI.downloadReport(caseId)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `SceneSolver_${caseId}_Report.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Report download failed')
    } finally {
      setDownloading(false)
    }
  }

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    setUpdatingStatus(true)
    try {
      await casesAPI.updateStatus(caseId, newStatus)
      setCaseData(prev => ({ ...prev, status: newStatus }))
      toast.success('Status updated')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 text-center">
          <p className="font-medium">{error}</p>
          <Link to="/cases" className="text-sm text-red-600 hover:underline mt-2 inline-block">← Back to Cases</Link>
        </div>
      </div>
    )
  }

  if (!caseData) return null

  const analysisReady = !!caseData.analysis_completed_at
  const analysisFailed = caseData.analysis_failed
  const analysisInProgress = !analysisReady && !analysisFailed

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Link to="/cases" className="text-gray-400 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{caseData.case_id}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Created {formatDateTime(caseData.created_at)} by {caseData.investigator_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {analysisInProgress && (
            <span className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Analysis running...
            </span>
          )}
          {analysisReady && caseData.report_url && (
            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <FileText className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download Report'}
            </button>
          )}
          <select
            value={caseData.status}
            onChange={handleStatusChange}
            disabled={updatingStatus}
            className="input-field w-auto text-sm py-1.5"
          >
            {CASE_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Analysis failed banner */}
      {analysisFailed && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">AI analysis failed for this case. Please re-upload the image.</p>
        </div>
      )}

      {/* Analysis in progress banner */}
      {analysisInProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-500 shrink-0 animate-spin" />
          <p className="text-sm text-blue-700">AI analysis is running. This page will update automatically.</p>
        </div>
      )}

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* Case info */}
          <Section title="Case Information">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500 text-xs">Case ID</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{caseData.case_id}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Status</dt>
                <dd className="mt-0.5"><StatusBadge status={caseData.status} /></dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Crime Type</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {caseData.crime_type || <span className="text-gray-300">Pending</span>}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Confidence</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{formatConfidence(caseData.crime_confidence)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Risk Level</dt>
                <dd className="mt-0.5"><RiskBadge level={caseData.risk_level} score={caseData.risk_score} size="md" /></dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Investigator</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{caseData.investigator_name}</dd>
              </div>
            </dl>
          </Section>

          {/* Scene Image */}
          <Section title="Scene Image (Annotated)">
            {caseData.annotated_image_url || caseData.image_url ? (
              <img
                src={caseData.annotated_image_url || caseData.image_url}
                alt="Crime scene"
                className="w-full rounded-lg object-contain bg-black max-h-72"
                onError={(e) => { e.target.src = caseData.image_url }}
              />
            ) : (
              <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                Image not available
              </div>
            )}
          </Section>

          {/* Evidence */}
          <Section title="Detected Evidence">
            <EvidenceTable evidence={caseData.evidence_detected} />
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* AI Summary */}
          <Section title="AI Crime Narrative">
            {caseData.ai_summary ? (
              <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-100">
                {caseData.ai_summary}
              </p>
            ) : (
              <p className="text-sm text-gray-400">{analysisInProgress ? 'Generating...' : 'Not available'}</p>
            )}
          </Section>

          {/* Sequence */}
          {caseData.sequence_of_events?.length > 0 && (
            <Section title="Probable Sequence of Events">
              <ol className="space-y-2 text-sm text-gray-700">
                {caseData.sequence_of_events.map((ev, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{ev}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* Recommendations */}
          {caseData.recommendations?.length > 0 && (
            <Section title="Investigation Recommendations">
              <ul className="space-y-2 text-sm text-gray-700">
                {caseData.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Notes */}
          <Section title="Investigator Notes">
            <NoteEditor
              caseId={caseId}
              notes={caseData.notes}
              onNoteAdded={fetchCase}
            />
          </Section>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
        <strong>Disclaimer:</strong> This analysis is AI-generated and probabilistic in nature. All findings are advisory only and do not constitute a legal determination, official police report, or forensic conclusion. Human investigators must verify all AI-generated content before use in any official capacity.
      </div>
    </div>
  )
}
