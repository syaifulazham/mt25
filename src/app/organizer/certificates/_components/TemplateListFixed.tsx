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
}

export function TemplateList({ session }: TemplateListProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const router = useRouter()

  // Role-based permissions
  const isAdmin = session.user.role === 'ADMIN'
  const canCreateTemplate = ['ADMIN', 'OPERATOR'].includes(session.user.role as string)
  
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

          {/* Templates grid */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-gray-500">No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => (
                <div key={template.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Template Thumbnail */}
                  <div className="bg-gray-100 h-48 flex items-center justify-center">
                    {template.basePdfPath ? (
                      <iframe 
                        src={`/uploads/templates/${template.basePdfPath.split('/').pop()}`} 
                        className="w-full h-full" 
                        title={template.templateName}
                      />
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
                          className="px-3 py-1 text-sm text-purple-600 hover:text-purple-800"
                          onClick={() => handleDuplicateTemplate(template.id)}
                        >
                          Duplicate
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
        </>
      )}
    </div>
  )
}
