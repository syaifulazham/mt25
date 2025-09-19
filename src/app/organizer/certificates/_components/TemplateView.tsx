'use client'

import { useState } from 'react'
import { Session } from 'next-auth'
import { useRouter } from 'next/navigation'

interface TemplateViewProps {
  template: any // Full template object from the database
  session: Session
}

export function TemplateView({ template, session }: TemplateViewProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Format dates
  const createdAt = new Date(template.createdAt).toLocaleString()
  const updatedAt = new Date(template.updatedAt).toLocaleString()

  // Check if user has admin rights
  const isAdmin = session?.user?.role === 'ADMIN'

  // Handle template duplication
  const handleDuplicate = async () => {
    try {
      const response = await fetch(`/api/certificates/templates/${template.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate template')
      }

      const data = await response.json()
      
      // Redirect to the new template
      router.push(`/organizer/certificates/templates/${data.template.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  // Handle template deletion
  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      
      const response = await fetch(`/api/certificates/templates/${template.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      // Redirect to templates list
      router.push('/organizer/certificates/templates')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="space-y-8">
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

      {/* Template Information */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Template Information</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Details and properties of the certificate template.</p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Template name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{template.templateName}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${template.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {template.status}
                </span>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Created by</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {template.creator?.name || 'Unknown'} ({createdAt})
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Last updated</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {template.updater?.name || 'Unknown'} ({updatedAt})
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Base PDF</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {template.basePdfPath ? (
                  <a 
                    href={`/uploads/templates/${template.basePdfPath.split('/').pop()}`} 
                    target="_blank" 
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {template.basePdfPath.split('/').pop()}
                  </a>
                ) : (
                  'No PDF attached'
                )}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Actions</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex space-x-2">
                  {/* Duplicate button for ADMIN and OPERATOR */}
                  {(session.user.role === 'ADMIN' || session.user.role === 'OPERATOR') && (
                    <button
                      onClick={handleDuplicate}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Duplicate Template
                    </button>
                  )}
                  
                  {/* Delete button for ADMIN only */}
                  {isAdmin && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Delete Template
                    </button>
                  )}
                </div>
                
                {/* Delete confirmation modal */}
                {showDeleteConfirm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Deletion</h3>
                      <p className="text-gray-700 mb-6">
                        Are you sure you want to delete the template "{template.templateName}"? This action cannot be undone.
                      </p>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                          disabled={isDeleting}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDelete}
                          className="bg-red-600 text-white px-4 py-2 rounded"
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* PDF Preview */}
      {template.basePdfPath && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Template Preview</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">PDF template visualization.</p>
          </div>
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <object
                data={`/uploads/templates/${template.basePdfPath.split('/').pop()}`}
                type="application/pdf"
                className="w-full h-96 border border-gray-300"
                onError={(e) => {
                  const target = e.target as HTMLObjectElement;
                  target.style.display = 'none';
                  // Show error message
                  const container = target.parentElement;
                  if (container) {
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'text-center py-20';
                    errorMsg.innerHTML = `
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p class="text-gray-500 mt-4">PDF preview not available</p>
                    `;
                    container.appendChild(errorMsg);
                  }
                }}
              >
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 mt-4">PDF preview not available</p>
                  </div>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}

      {/* Elements List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Template Elements</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Elements placed on the certificate template.</p>
        </div>
        <div className="border-t border-gray-200">
          {template.configuration?.elements?.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {template.configuration.elements.map((element: any) => (
                <li key={element.id} className="px-6 py-4">
                  <div className="grid sm:grid-cols-4 gap-4">
                    <div>
                      <span className="font-medium">Type:</span> {element.type}
                    </div>
                    <div>
                      <span className="font-medium">Content:</span> {element.content || element.placeholder || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Position:</span> X: {element.position.x}, Y: {element.position.y}
                    </div>
                    <div>
                      <span className="font-medium">Layer:</span> {element.layer}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No elements have been added to this template yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
