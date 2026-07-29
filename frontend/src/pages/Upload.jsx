import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { casesAPI } from '../services/api'
import ImageUploader from '../components/ImageUploader'
import AnalysisProgress from '../components/AnalysisProgress'

export default function Upload() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [caseId, setCaseId] = useState(null)
  const [step, setStep] = useState(0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setStep(1)

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Simulate step progress visually
      const progressInterval = setInterval(() => {
        setStep(prev => (prev < 5 ? prev + 1 : prev))
      }, 4000)

      const res = await casesAPI.upload(formData)
      clearInterval(progressInterval)
      setStep(6)
      const newCaseId = res.data.case_id
      setCaseId(newCaseId)
      toast.success(`Case ${newCaseId} created. Pipeline running in background.`)

      // Navigate to case detail after short delay
      setTimeout(() => navigate(`/cases/${newCaseId}`), 1500)
    } catch (err) {
      setStep(0)
      setUploading(false)
      toast.error(err.response?.data?.detail || 'Upload failed. Please try again.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Crime Scene</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload an image to start the AI analysis pipeline. Analysis completes within ~30 seconds.
        </p>
      </div>

      {!uploading ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">Scene Image</h2>
            <ImageUploader onFileSelect={setFile} disabled={uploading} />
          </div>

          <div className="card bg-blue-50 border-blue-100">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">What happens after upload:</h3>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside leading-relaxed">
              <li>CLIP model classifies the crime type with confidence score</li>
              <li>YOLOv8 detects and locates evidence objects</li>
              <li>Risk engine computes weighted 0–100 risk score</li>
              <li>Groq LLM generates narrative, timeline, and recommendations</li>
              <li>ReportLab assembles a downloadable PDF forensic report</li>
            </ol>
          </div>

          <button
            type="submit"
            disabled={!file || uploading}
            className="btn-primary w-full py-3 text-base"
          >
            Start AI Analysis
          </button>
        </form>
      ) : (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-5">
            {caseId ? `Analysis complete — ${caseId}` : 'Running AI Pipeline...'}
          </h2>
          <AnalysisProgress currentStep={step} completed={step >= 6} />
          {caseId && (
            <p className="text-sm text-center text-gray-500 mt-4">
              Redirecting to case detail...
            </p>
          )}
        </div>
      )}
    </div>
  )
}
