import { CheckCircle, Loader2, Circle } from 'lucide-react'
import clsx from 'clsx'

const STEPS = [
  { id: 1, label: 'Crime Classification', desc: 'CLIP model analyzing scene type' },
  { id: 2, label: 'Evidence Detection', desc: 'YOLOv8 scanning for evidence objects' },
  { id: 3, label: 'Statistics Aggregation', desc: 'Compiling detection results' },
  { id: 4, label: 'AI Reasoning', desc: 'Groq LLM generating narrative' },
  { id: 5, label: 'Risk Assessment', desc: 'Computing weighted risk score' },
  { id: 6, label: 'Report Generation', desc: 'Assembling PDF report' },
]

export default function AnalysisProgress({ currentStep = 0, completed = false, failed = false }) {
  return (
    <div className="space-y-3">
      {STEPS.map((step) => {
        const isDone = completed || step.id < currentStep
        const isActive = !completed && !failed && step.id === currentStep
        const isPending = !completed && step.id > currentStep

        return (
          <div
            key={step.id}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-lg border transition-all',
              isDone && 'bg-green-50 border-green-200',
              isActive && 'bg-blue-50 border-blue-300',
              isPending && 'bg-gray-50 border-gray-100',
              failed && step.id === currentStep && 'bg-red-50 border-red-200',
            )}
          >
            <div className="shrink-0">
              {isDone && <CheckCircle className="w-5 h-5 text-green-500" />}
              {isActive && !failed && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
              {isActive && failed && <Circle className="w-5 h-5 text-red-400" />}
              {isPending && <Circle className="w-5 h-5 text-gray-300" />}
            </div>
            <div>
              <p className={clsx(
                'text-sm font-medium',
                isDone && 'text-green-700',
                isActive && !failed && 'text-blue-700',
                isPending && 'text-gray-400',
              )}>
                Step {step.id} — {step.label}
              </p>
              <p className="text-xs text-gray-400">{step.desc}</p>
            </div>
          </div>
        )
      })}
      {completed && (
        <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-center">
          <p className="text-green-700 font-semibold text-sm">Analysis Complete</p>
        </div>
      )}
      {failed && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-center">
          <p className="text-red-700 font-semibold text-sm">Analysis Failed — please try again</p>
        </div>
      )}
    </div>
  )
}
