'use client'

import React, { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TemplateListSkeleton } from './TemplateListSkeleton'

interface Template {
  id: number
  templateName: string
  basePdfPath: string | null
  status: 'ACTIVE' | 'INACTIVE'
  targetType: 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 'NON_CONTEST_PARTICIPANT'
  eventId: number | null
  createdAt: string
  updatedAt: string
  creator: {
    id: number
    name: string | null
    email: string
  }
  updater?: {
    id: number
    name: string | null
    email: string
  } | null
}

interface TemplateListProps {
  session: Session | null
  initialData?: any
  userSession?: Session | null
}

export function TemplateList({ session, userSession }: TemplateListProps) {
  // Use userSession if provided (for compatibility), otherwise use session
  const activeSession = userSession || session
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const router = useRouter()

  // Role-based permissions
  const isAdmin = activeSession?.user?.role === 'ADMIN'
  const canCreateTemplate = activeSession?.user?.role && ['ADMIN', 'OPERATOR'].includes(activeSession.user.role as string)

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: '12',
          ...(searchTerm && { search: searchTerm }),
          status: 'ACTIVE'
        })

        const response = await fetch(`/api/certificates/templates?${queryParams}`)

        if (!response.ok) {
          throw new Error('Failed to fetch templates')
        }

        const data = await response.json()
        setTemplates(data.templates)
        setTotalPages(data.pagination.totalPages)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching templates:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [searchTerm, currentPage])

  // Handle template deletion
  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return
    }

    try {
      const response = await fetch(`/api/certificates/templates/${templateId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      // Refresh templates list
      setTemplates(templates.filter(template => template.id !== templateId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
      console.error('Error deleting template:', err)
    }
  }

  // Handle template duplication
  const handleDuplicateTemplate = async (templateId: number) => {
    try {
      const response = await fetch(`/api/certificates/templates/${templateId}/duplicate`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate template')
      }

      const data = await response.json()

      // Refresh templates list
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate template')
      console.error('Error duplicating template:', err)
    }
  }

  // Filter templates based on search term
  const filteredTemplates = templates.filter(template =>
    template.templateName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <TemplateListSkeleton />
      ) : (
        <>
          {/* Search and Create button */}
          <div className="flex justify-between items-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Search templates..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {canCreateTemplate && (
              <Link
                href="/organizer/certificates/templates/create"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Template
              </Link>
            )}
          </div>

          {/* Templates list */}
          <div className="space-y-4">
            {filteredTemplates.map(template => (
              <div key={template.id} className="bg-white shadow-sm rounded-md p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium">{template.templateName}</h2>
                    <p className="text-sm text-gray-600">{template.creator.name}</p>
                    {template.targetType && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {template.targetType.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Generate button for EVENT_PARTICIPANT templates */}
                    {template.targetType === 'EVENT_PARTICIPANT' && template.eventId && (
                      <Link
                        href={`/organizer/certificates/templates/${template.id}/generate`}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 inline-flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generate
                      </Link>
                    )}
                    {/* Manage Winners button for EVENT_WINNER templates */}
                    {template.targetType === 'EVENT_WINNER' && template.eventId && (
                      <Link
                        href={`/organizer/events/${template.eventId}/certificates/winners`}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 inline-flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Manage Winners
                      </Link>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-700 inline-flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    )}
                    <button
                      onClick={() => handleDuplicateTemplate(template.id)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2z" />
                      </svg>
                      Duplicate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {(() => {
                  const pageButtons = [];
                  const startPage = Math.max(1, currentPage - 2);
                  const endPage = Math.min(totalPages, startPage + 4);
                  
                  for (let page = startPage; page <= endPage; page++) {
                    pageButtons.push(
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${currentPage === page ? 'bg-blue-50 text-blue-600 z-10' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        {page}
                      </button>
                    );
                  }
                  
                  return pageButtons;
                })()}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  )
}
