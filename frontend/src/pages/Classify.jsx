import { useState } from 'react'
import { Brain, RotateCcw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { classifyAPI } from '../services/api'
import ImageUploader from '../components/ImageUploader'

const CRIME_ICONS = {
  Arrest: '🚔', Assault: '⚠️', Burglary: '🏚️', Fighting: '🥊',
  Robbery: '💰', 'Road Accident': '🚗', Shooting: '🔫',
  Stealing: '👜', Vandalism: '🪟', Explosion: '💥',
}

const RISK_META = {
  Shooting:       { level: 'critical', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  Explosion:      { level: 'critical', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  Assault:        { level: 'high',     color: 'bg-red-100 text-red-800 border-red-200' },
  Robbery:        { level: 'high',     color: 'bg-red-100 text-red-800 border-red-200' },
  Fighting:       { level: 'high',     color: 'bg-red-100 text-red-800 border-red-200' },
  Arrest:         { level: 'medium',   color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  Burglary:       { level: 'medium',   color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  Stealing:       { level: 'medium',   color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'Road Accident':{ level: 'medium',   color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  Vandalism:      { level: 'low',      color: 'bg-green-100 text-green-800 border-green-200' },
}

function ConfidenceBar({ value, color = 'bg-blue-500' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${(value * 100).toFixed(1)}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-500 w-12 text-right">
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  )
}

export default function Classify() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleFileSelect = (f) => {
    setFile(f)
    setResult(null)
    if (f) setPreview(URL.createObjectURL(f))
    else setPreview(null)
  }

  const handleClassify = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await classifyAPI.classify(fd)
      setResult(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Classification failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
  }

  const meta = result ? (RISK_META[result.predicted_class] || { level: 'low', color: 'bg-gray-100 text-gray-700 border-gray-200' }) : null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-6 h-6 text-blue-600" />
          Crime Scene Classifier
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload a crime scene image for instant AI classification. No case is created — this is a quick analysis tool.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — upload */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Upload Image</h2>
          <ImageUploader onFileSelect={handleFileSelect} disabled={loading} />
          <div className="flex gap-2">
            <button
              onClick={handleClassify}
              disabled={!file || loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Classifying...</>
                : <><Brain className="w-4 h-4" /> Classify Scene</>
              }
            </button>
            {(file || result) && (
              <button onClick={handleReset} className="btn-secondary px-3" title="Reset">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* How it works */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">How it works</p>
            <p>The CLIP model (ViT-B/32) encodes your image and computes cosine similarity against 10 crime-type text embeddings. The highest match is returned as the predicted class.</p>
          </div>
        </div>

        {/* Right — result */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Classification Result</h2>

          {!result && !loading && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <Brain className="w-12 h-12 mb-3" />
              <p className="text-sm">Upload an image to see results</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Running CLIP model...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Top prediction card */}
              <div className={`border rounded-xl p-4 ${meta.color}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{CRIME_ICONS[result.predicted_class] || '🔍'}</span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Predicted Crime Type</p>
                    <p className="text-xl font-bold">{result.predicted_class}</p>
                    <p className="text-sm font-medium mt-0.5">
                      Confidence: {(result.confidence * 100).toFixed(1)}%
                      &nbsp;·&nbsp;
                      Risk: <span className="capitalize">{meta.level}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  AI classification is probabilistic. Results should be verified by investigators.
                </p>
              </div>

              {/* All probabilities */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">All Class Probabilities</p>
                <div className="space-y-2">
                  {result.all_probabilities.map((item) => {
                    const isTop = item.crime_type === result.predicted_class
                    return (
                      <div key={item.crime_type}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs ${isTop ? 'font-bold text-blue-700' : 'text-gray-600'}`}>
                            {CRIME_ICONS[item.crime_type]} {item.crime_type}
                            {isTop && <span className="ml-1.5 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">TOP</span>}
                          </span>
                        </div>
                        <ConfidenceBar
                          value={item.probability}
                          color={isTop ? 'bg-blue-600' : 'bg-gray-300'}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
