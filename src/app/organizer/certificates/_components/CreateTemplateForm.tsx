'use client'

import { useState } from 'react'
import { Session } from 'next-auth'
import { useRouter } from 'next/navigation'

interface CreateTemplateFormProps {
  session: Session
}

export function CreateTemplateForm({ session }: CreateTemplateFormProps) {
  const router = useRouter()
  
  // Form state
  const [templateName, setTemplateName] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed')
      setPdfFile(null)
      setPdfPreviewUrl(null)
      return
    }

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPdfFile(file)
    setPdfPreviewUrl(url)
    setError(null)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)
      
      // Validate inputs
      if (!templateName.trim()) {
        setError('Template name is required')
        return
      }
      
      if (!pdfFile) {
        setError('Please upload a PDF template')
        return
      }
      
      // Upload PDF file first
      const formData = new FormData()
      formData.append('file', pdfFile)
      
      const uploadResponse = await fetch('/api/certificates/upload-pdf', {
        method: 'POST',
        body: formData
      })
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload PDF file')
      }
      
      const { filePath } = await uploadResponse.json()
      
      // Create template with uploaded PDF path
      const templateResponse = await fetch('/api/certificates/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateName,
          basePdfPath: filePath,
          configuration: {
            canvas: {
              width: 842, // A4 width in points
              height: 595, // A4 height in points
              scale: 1.0
            },
            background: {
              pdf_path: filePath,
              page: 1
            },
            elements: []
          }
        })
      })
      
      if (!templateResponse.ok) {
        throw new Error('Failed to create template')
      }
      
      const { template } = await templateResponse.json()
      
      // Redirect to template editor
      router.push(`/organizer/certificates/templates/${template.id}/edit`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Template creation error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Template Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Template Name
        </label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter template name"
          disabled={loading}
          required
        />
      </div>

      {/* PDF Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload PDF Template
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <span>Upload a PDF file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PDF up to 10MB</p>
          </div>
        </div>
      </div>

      {/* PDF Preview */}
      {pdfPreviewUrl && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PDF Preview
          </label>
          <div className="mt-1 border border-gray-300 rounded-md overflow-hidden">
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-96"
              title="PDF Preview"
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.push('/organizer/certificates/templates')}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Template...
            </>
          ) : (
            'Create Template'
          )}
        </button>
      </div>
    </form>
  )
}
