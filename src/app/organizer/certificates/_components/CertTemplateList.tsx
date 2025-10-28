'use client'

import React, { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Template {
  id: number
  templateName: string
  basePdfPath: string | null
  status: 'ACTIVE' | 'INACTIVE'
  targetType?: 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 'NON_CONTEST_PARTICIPANT' | 'QUIZ_PARTICIPANT' | 'QUIZ_WINNER'
  eventId?: number | null
  quizId?: number | null
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
  session: Session
  initialTemplates?: Template[]
  initialPagination?: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
  }
  searchQuery?: string
}

export function CertTemplateList({ 
  session, 
  initialTemplates = [], 
  initialPagination = { page: 1, limit: 12, totalCount: 0, totalPages: 1 },
  searchQuery = '' 
}: TemplateListProps) {
  const [isLoading, setIsLoading] = useState(initialTemplates.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [searchTerm, setSearchTerm] = useState(searchQuery)
  const [currentPage, setCurrentPage] = useState(1)
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null)
  const router = useRouter()
  
  const ITEMS_PER_PAGE = 12

  // Role-based permissions
  const isAdmin = session.user.role === 'ADMIN'
  const canCreateTemplate = ['ADMIN', 'OPERATOR'].includes(session.user.role as string)
  
  // Fetch all templates from API (no server-side pagination)
  const fetchTemplates = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams({
        page: '1',
        pageSize: '1000', // Fetch all templates
        ...(searchTerm && { search: searchTerm }),
        status: 'ACTIVE'
      })
      
      const response = await fetch(`/api/certificates/templates?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      
      const data = await response.json()
      setTemplates(data.templates)
      setCurrentPage(1) // Reset to first page when data changes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching templates:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    if (initialTemplates.length === 0 || searchTerm !== searchQuery) {
      fetchTemplates()
    }
  }, [searchTerm, initialTemplates, searchQuery])
  
  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

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
      setDuplicatingId(templateId)
      
      const response = await fetch(`/api/certificates/templates/${templateId}/duplicate`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to duplicate template')
      }
      
      const data = await response.json()
      
      // Show success message
      toast.success('Template duplicated successfully!')
      
      // Refresh templates list after duplication
      await fetchTemplates()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate template'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Error duplicating template:', err)
    } finally {
      setDuplicatingId(null)
    }
  }

  // Filter templates based on search term
  const filteredTemplates = templates.filter(template =>
    template.templateName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group templates by targetType and sort by name
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const targetType = template.targetType || 'GENERAL'
    if (!acc[targetType]) {
      acc[targetType] = []
    }
    acc[targetType].push(template)
    return acc
  }, {} as Record<string, Template[]>)

  // Sort templates within each group by name
  Object.keys(groupedTemplates).forEach(key => {
    groupedTemplates[key].sort((a, b) => a.templateName.localeCompare(b.templateName))
  })

  // Sort groups by targetType name
  const sortedGroupKeys = Object.keys(groupedTemplates).sort()
  
  // Flatten grouped templates for pagination
  const flattenedTemplates: Template[] = []
  sortedGroupKeys.forEach(key => {
    flattenedTemplates.push(...groupedTemplates[key])
  })
  
  // Calculate pagination
  const totalItems = flattenedTemplates.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedTemplates = flattenedTemplates.slice(startIndex, endIndex)
  
  // Re-group paginated templates
  const paginatedGroupedTemplates = paginatedTemplates.reduce((acc, template) => {
    const targetType = template.targetType || 'GENERAL'
    if (!acc[targetType]) {
      acc[targetType] = []
    }
    acc[targetType].push(template)
    return acc
  }, {} as Record<string, Template[]>)
  
  // Sort paginated groups
  const paginatedGroupKeys = Object.keys(paginatedGroupedTemplates).sort()

  // Helper function to format targetType labels
  const formatTargetType = (targetType: string) => {
    const typeLabels: Record<string, string> = {
      'GENERAL': 'General Certificates',
      'EVENT_PARTICIPANT': 'Event Participant Certificates',
      'EVENT_WINNER': 'Event Winner Certificates',
      'NON_CONTEST_PARTICIPANT': 'Non-Contest Participant Certificates',
      'QUIZ_PARTICIPANT': 'Quiz Participant Certificates',
      'QUIZ_WINNER': 'Quiz Winner Certificates'
    }
    return typeLabels[targetType] || targetType.replace(/_/g, ' ')
  }

  const renderTemplateSkeletons = () => {
    return Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="border rounded-lg overflow-hidden shadow-sm animate-pulse">
        <div className="bg-gray-200 h-48"></div>
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-100 rounded w-1/2"></div>
          <div className="h-3 bg-gray-100 rounded w-1/4 mt-2"></div>
          <div className="h-8 flex justify-end gap-2 mt-4">
            <div className="w-16 h-5 bg-gray-100 rounded"></div>
            <div className="w-16 h-5 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    ))
  }

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

      {/* Search input */}
      <div className="flex justify-between items-center">
        <div>
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
          {totalItems > 0 && (
            <div className="text-sm text-gray-500 mt-2">
              Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} templates
            </div>
          )}
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
      
      {/* Templates grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderTemplateSkeletons()}
        </div>
      ) : flattenedTemplates.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-gray-500">{searchTerm ? `No templates found for "${searchTerm}"` : 'No templates found'}</p>
          {canCreateTemplate && (
            <div className="mt-4">
              <Link
                href="/organizer/certificates/templates/create"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create your first template
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {paginatedGroupKeys.map(targetType => (
            <div key={targetType} className="space-y-4">
              {/* Group Header */}
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{formatTargetType(targetType)}</h3>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                  {paginatedGroupedTemplates[targetType].length}
                </span>
              </div>
              
              {/* Templates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedGroupedTemplates[targetType].map(template => (
            <div key={template.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Template Thumbnail */}
              <div className="bg-gray-100 h-48 flex items-center justify-center">
                {template.basePdfPath ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <object
                      data={`/uploads/templates/${template.basePdfPath.split('/').pop()}`}
                      type="application/pdf"
                      className="w-full h-full"
                      onError={(e) => {
                        // Fall back to placeholder on error
                        const target = e.target as HTMLObjectElement;
                        target.style.display = 'none';
                      }}
                    >
                      <div className="text-center p-4">
                        <p className="text-gray-500 mb-2">PDF preview not available</p>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </object>
                  </div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              
              {/* Template Details */}
              <div className="p-4">
                <h3 className="font-bold text-lg truncate">{template.templateName}</h3>
                <p className="text-gray-500 text-sm truncate">
                  Created by: {template.creator.name || template.creator.email}
                </p>
                <div className="mt-2 text-xs text-gray-400">
                  Updated: {new Date(template.updatedAt).toLocaleDateString()}
                </div>
                
                {/* Target Type Badge */}
                {template.targetType && (
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {template.targetType.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="mt-4 flex justify-end space-x-2">
                  <Link
                    href={`/organizer/certificates/templates/${template.id}`}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    View
                  </Link>
                  
                  {canCreateTemplate && (
                    <Link
                      href={`/organizer/certificates/templates/${template.id}/edit`}
                      className="px-3 py-1 text-sm text-green-600 hover:text-green-800"
                    >
                      Edit
                    </Link>
                  )}
                  
                  {canCreateTemplate && (
                    <button
                      className="px-3 py-1 text-sm text-purple-600 hover:text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleDuplicateTemplate(template.id)}
                      disabled={duplicatingId === template.id}
                    >
                      {duplicatingId === template.id ? 'Duplicating...' : 'Duplicate'}
                    </button>
                  )}
                  
                  {isAdmin && (
                    <button
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
                
                {/* Generate Button for EVENT_PARTICIPANT templates */}
                {template.targetType === 'EVENT_PARTICIPANT' && template.eventId && canCreateTemplate && (
                  <div className="mt-3">
                    <Link
                      href={`/organizer/certificates/templates/${template.id}/generate`}
                      className="w-full inline-flex justify-center items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Generate Certificates
                    </Link>
                  </div>
                )}
                
                {/* Manage Winners Button for EVENT_WINNER templates */}
                {template.targetType === 'EVENT_WINNER' && template.eventId && canCreateTemplate && (
                  <div className="mt-3">
                    <Link
                      href={`/organizer/events/${template.eventId}/certificates/winners`}
                      className="w-full inline-flex justify-center items-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Manage Winners
                    </Link>
                  </div>
                )}
                
                {/* Manage Participants Button for QUIZ_PARTICIPANT templates */}
                {template.targetType === 'QUIZ_PARTICIPANT' && template.quizId && canCreateTemplate && (
                  <div className="mt-3">
                    <Link
                      href={`/organizer/quizzes/${template.quizId}/result`}
                      className="w-full inline-flex justify-center items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Manage Participants
                    </Link>
                  </div>
                )}
                
                {/* Manage Winners Button for QUIZ_WINNER templates */}
                {template.targetType === 'QUIZ_WINNER' && template.quizId && canCreateTemplate && (
                  <div className="mt-3">
                    <Link
                      href={`/organizer/quizzes/${template.quizId}/result/winners`}
                      className="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Manage Winners
                    </Link>
                  </div>
                )}
              </div>
            </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
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
    </div>
  )
}
