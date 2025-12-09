'use client'

import React, { useState, useEffect } from 'react'
import { X, FileText, Loader2 } from 'lucide-react'

interface Template {
  id: number
  templateName: string
  targetType: string
  status: string
}

interface TemplateFilterModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (templateId: number | null, templateName: string) => void
  selectedTemplateId: number | null
}

export function TemplateFilterModal({
  isOpen,
  onClose,
  onSelectTemplate,
  selectedTemplateId
}: TemplateFilterModalProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch all templates by using a large page size
      const response = await fetch('/api/certificates/templates?status=ACTIVE&pageSize=1000')
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates')
      console.error('Error fetching templates:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const groupTemplatesByType = () => {
    const grouped: Record<string, Template[]> = {}
    
    templates.forEach(template => {
      const type = template.targetType || 'GENERAL'
      if (!grouped[type]) {
        grouped[type] = []
      }
      grouped[type].push(template)
    })
    
    return grouped
  }

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'GENERAL':
        return 'General'
      case 'EVENT_PARTICIPANT':
        return 'Event Participant'
      case 'EVENT_WINNER':
        return 'Event Winner'
      case 'NON_CONTEST_PARTICIPANT':
        return 'Non-Contest Participant'
      case 'QUIZ_PARTICIPANT':
        return 'Quiz Participant'
      case 'QUIZ_WINNER':
        return 'Quiz Winner'
      default:
        return type
    }
  }

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'GENERAL':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100'
      case 'EVENT_PARTICIPANT':
        return 'bg-green-50 border-green-200 hover:bg-green-100'
      case 'EVENT_WINNER':
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
      case 'NON_CONTEST_PARTICIPANT':
        return 'bg-purple-50 border-purple-200 hover:bg-purple-100'
      case 'QUIZ_PARTICIPANT':
        return 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
      case 'QUIZ_WINNER':
        return 'bg-pink-50 border-pink-200 hover:bg-pink-100'
      default:
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100'
    }
  }

  const handleSelect = (templateId: number | null, templateName: string) => {
    onSelectTemplate(templateId, templateName)
    onClose()
  }

  if (!isOpen) return null

  const groupedTemplates = groupTemplatesByType()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Filter by Template
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
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
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No active certificate templates available.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Show All Option */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">All Templates</h4>
                <button
                  onClick={() => handleSelect(null, 'All Templates')}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                    selectedTemplateId === null
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-900">Show All Templates</span>
                    </div>
                    {selectedTemplateId === null && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 ml-8">
                    Display certificates from all templates
                  </p>
                </button>
              </div>

              {/* Grouped Templates */}
              {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
                <div key={type}>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    {getTypeLabel(type)}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {typeTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelect(template.id, template.templateName)}
                        className={`p-4 border-2 rounded-lg text-left transition-colors ${
                          selectedTemplateId === template.id
                            ? `${getTypeColor(type)} ring-2 ring-offset-1`
                            : `${getTypeColor(type)}`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {template.templateName}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Template ID: {template.id}
                            </p>
                          </div>
                          {selectedTemplateId === template.id && (
                            <div className="ml-2 flex-shrink-0">
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
