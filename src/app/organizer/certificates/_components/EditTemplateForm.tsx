'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { useRouter } from 'next/navigation'

interface EditTemplateFormProps {
  template: any // Full template object from the database
  session: Session
}

export function EditTemplateForm({ template, session }: EditTemplateFormProps) {
  const router = useRouter()
  
  // Form state
  const [templateName, setTemplateName] = useState(template.templateName)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(template.basePdfPath || null)
  const [elements, setElements] = useState(template.configuration.elements || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed')
      setPdfFile(null)
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
      setSuccess(null)
      
      // Validate inputs
      if (!templateName.trim()) {
        setError('Template name is required')
        return
      }
      
      let updatedTemplate: any = {
        templateName,
      }

      // If a new PDF file was selected, upload it first
      if (pdfFile) {
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
        updatedTemplate.basePdfPath = filePath
        
        // Update configuration background as well
        updatedTemplate.configuration = {
          ...template.configuration,
          background: {
            ...template.configuration.background,
            pdf_path: filePath
          }
        }
      } else if (elements.length > 0) {
        // Only update elements if they've changed
        updatedTemplate.configuration = {
          ...template.configuration,
          elements
        }
      }
      
      // Send update request
      const updateResponse = await fetch(`/api/certificates/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedTemplate)
      })
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update template')
      }
      
      // Show success message
      setSuccess('Template updated successfully')
      
      // Refresh data after a short delay
      setTimeout(() => {
        router.refresh()
      }, 1500)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Template update error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Template elements editor would go here (placeholder for now)
  const addElement = () => {
    // This would be implemented with a real element editor component
    const newElement = {
      id: `element_${Date.now()}`,
      type: 'static_text',
      content: 'New text element',
      position: { x: 200, y: 200 },
      style: {
        font_family: 'Arial',
        font_size: 18,
        font_weight: 'normal',
        color: '#000000',
        align: 'center'
      },
      layer: elements.length + 1
    }
    
    setElements([...elements, newElement])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Success message */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                {success}
              </p>
            </div>
          </div>
        </div>
      )}

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
          Replace PDF Template (Optional)
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
                <span>Upload a new PDF file</span>
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
            {template.basePdfPath && !pdfFile && (
              <p className="text-xs text-blue-500">Current file: {template.basePdfPath.split('/').pop()}</p>
            )}
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
              src={pdfFile ? pdfPreviewUrl : `/uploads/templates/${pdfPreviewUrl}`}
              className="w-full h-96"
              title="PDF Preview"
            />
          </div>
        </div>
      )}

      {/* Elements Editor (placeholder - would be replaced with actual editor component) */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Template Elements
          </label>
          <button
            type="button"
            onClick={addElement}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Element
          </button>
        </div>
        <div className="border border-gray-300 rounded-md p-4">
          {elements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No elements added yet. Click "Add Element" to add content to your template.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {elements.map((element: any, index: number) => (
                <li key={element.id} className="py-3">
                  <div className="flex justify-between">
                    <div>
                      <span className="font-medium">{element.type}</span>
                      {element.content && (
                        <p className="text-sm text-gray-500">{element.content}</p>
                      )}
                      {element.placeholder && (
                        <p className="text-sm text-gray-500">{element.placeholder}</p>
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 text-sm"
                        onClick={() => {
                          const updatedElements = [...elements]
                          updatedElements.splice(index, 1)
                          setElements(updatedElements)
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Note: This is a simplified element editor. A full visual editor would be implemented in the final version.
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.push(`/organizer/certificates/templates/${template.id}`)}
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
              Updating Template...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  )
}
