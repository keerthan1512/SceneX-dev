import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, ImageIcon } from 'lucide-react'
import clsx from 'clsx'

const ACCEPTED = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }
const MAX_SIZE = 20 * 1024 * 1024

export default function ImageUploader({ onFileSelect, disabled = false }) {
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)

  const onDrop = useCallback((accepted, rejected) => {
    setError(null)
    if (rejected.length > 0) {
      const err = rejected[0].errors[0]
      if (err.code === 'file-too-large') setError('File too large. Maximum size is 20MB.')
      else if (err.code === 'file-invalid-type') setError('Invalid file type. Please upload a JPEG, PNG, or WebP image.')
      else setError(err.message)
      return
    }
    const f = accepted[0]
    setFile(f)
    setPreview(URL.createObjectURL(f))
    onFileSelect(f)
  }, [onFileSelect])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    maxFiles: 1,
    disabled,
  })

  const clear = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    onFileSelect(null)
  }

  return (
    <div className="space-y-3">
      {!preview ? (
        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          {isDragActive ? (
            <p className="text-blue-600 font-medium">Drop the image here</p>
          ) : (
            <>
              <p className="text-gray-600 font-medium">Drag & drop a crime scene image</p>
              <p className="text-gray-400 text-sm mt-1">or click to browse files</p>
              <p className="text-gray-300 text-xs mt-3">JPEG, PNG, WebP — max 20MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-black">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-80 object-contain"
          />
          <button
            onClick={clear}
            disabled={disabled}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-white/70" />
            <span className="text-white text-xs truncate">{file?.name}</span>
            <span className="text-white/50 text-xs ml-auto">
              {file ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : ''}
            </span>
          </div>
        </div>
      )}
      {error && (
        <p className="text-red-600 text-sm flex items-center gap-1.5">
          <X className="w-4 h-4" /> {error}
        </p>
      )}
    </div>
  )
}
