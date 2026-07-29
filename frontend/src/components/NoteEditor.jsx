import { useState } from 'react'
import { Send, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { casesAPI } from '../services/api'
import { formatDateTime } from '../utils/formatters'

export default function NoteEditor({ caseId, notes = [], onNoteAdded }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    try {
      await casesAPI.addNote(caseId, text.trim())
      setText('')
      toast.success('Note added')
      onNoteAdded?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Existing notes */}
      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.note_id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700">{note.author_name}</span>
                <span className="text-xs text-gray-400">{formatDateTime(note.created_at)}</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{note.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 py-2">No notes yet.</p>
      )}

      {/* Add note */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add an investigator note..."
          rows={3}
          maxLength={5000}
          className="input-field resize-none text-sm"
          disabled={saving}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{text.length}/5000</span>
          <div className="flex gap-2">
            {text && (
              <button
                type="button"
                onClick={() => setText('')}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <button
              type="submit"
              disabled={!text.trim() || saving}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
