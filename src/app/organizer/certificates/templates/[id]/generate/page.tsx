'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Contestant {
  id: number
  name: string
  ic: string
  contingent: {
    id: number
    name: string
  }
  certificateStatus?: 'Listed' | 'Generated' | null
  certificateId?: number | null
  generationStatus?: 'pending' | 'generating' | 'completed' | 'failed'
}

interface Template {
  id: number
  templateName: string
  eventId: number
  event?: {
    id: number
    name: string
  }
}

export default function BulkGeneratePage() {
  const params = useParams()
  const router = useRouter()
  const templateId = parseInt(params.id as string)
  
  const [template, setTemplate] = useState<Template | null>(null)
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedContestants, setSelectedContestants] = useState<number[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [currentGeneratingId, setCurrentGeneratingId] = useState<number | null>(null)
  const [generationResults, setGenerationResults] = useState<{
    success: number[]
    failed: Array<{ id: number; error: string }>
  }>({ success: [], failed: [] })

  // Fetch template and contestants
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch template details
        const templateResponse = await fetch(`/api/certificates/templates/${templateId}`)
        if (!templateResponse.ok) {
          throw new Error('Failed to fetch template')
        }
        const templateData = await templateResponse.json()
        setTemplate(templateData.template)

        // Fetch contestants with attendance status
        const contestantsResponse = await fetch(
          `/api/certificates/templates/${templateId}/contestants-for-generation`
        )
        if (!contestantsResponse.ok) {
          throw new Error('Failed to fetch contestants')
        }
        const contestantsData = await contestantsResponse.json()
        setContestants(contestantsData.contestants || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [templateId])

  // Handle select all (includes all contestants for regeneration support)
  const handleSelectAll = () => {
    if (selectedContestants.length === contestants.length) {
      setSelectedContestants([])
    } else {
      setSelectedContestants(contestants.map(c => c.id))
    }
  }

  // Handle individual selection
  const handleSelect = (contestantId: number) => {
    setSelectedContestants(prev =>
      prev.includes(contestantId)
        ? prev.filter(id => id !== contestantId)
        : [...prev, contestantId]
    )
  }

  // Handle bulk generation button click
  const handleGenerateCertificates = () => {
    if (selectedContestants.length === 0) {
      alert('Please select at least one contestant')
      return
    }
    setShowConfirmModal(true)
  }

  // Handle confirmed generation - process one by one
  const handleConfirmGeneration = async () => {
    setShowConfirmModal(false)
    setIsGenerating(true)
    setGenerationProgress({ current: 0, total: selectedContestants.length })
    setGenerationResults({ success: [], failed: [] })

    const results = { success: [] as number[], failed: [] as Array<{ id: number; error: string }> }

    for (let i = 0; i < selectedContestants.length; i++) {
      const contestantId = selectedContestants[i]
      setCurrentGeneratingId(contestantId)
      setGenerationProgress({ current: i + 1, total: selectedContestants.length })

      // Update contestant status to 'generating'
      setContestants(prev => prev.map(c => 
        c.id === contestantId ? { ...c, generationStatus: 'generating' as const } : c
      ))

      try {
        const response = await fetch(`/api/certificates/templates/${templateId}/bulk-generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contestantIds: [contestantId] })
        })

        if (!response.ok) {
          throw new Error('Failed to generate certificate')
        }

        const result = await response.json()
        
        if (result.failed > 0) {
          throw new Error(result.errors?.[0]?.error || 'Generation failed')
        }

        // Mark as completed
        results.success.push(contestantId)
        setContestants(prev => prev.map(c => 
          c.id === contestantId 
            ? { ...c, generationStatus: 'completed' as const, certificateStatus: 'Generated' as const } 
            : c
        ))
      } catch (err) {
        // Mark as failed
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        results.failed.push({ id: contestantId, error: errorMsg })
        setContestants(prev => prev.map(c => 
          c.id === contestantId ? { ...c, generationStatus: 'failed' as const } : c
        ))
      }

      // Small delay between generations for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    setCurrentGeneratingId(null)
    setIsGenerating(false)
    setGenerationResults(results)

    // Show results
    const message = `Generation complete!\n✓ Success: ${results.success.length}\n✗ Failed: ${results.failed.length}`
    alert(message)

    // Reload to get fresh data
    if (results.success.length > 0) {
      window.location.reload()
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{error}</p>
        </div>
        <Link href="/organizer/certificates/templates" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to Templates
        </Link>
      </div>
    )
  }

  const notGeneratedCount = contestants.filter(c => !c.certificateStatus || c.certificateStatus === 'Listed').length
  const generatedCount = contestants.filter(c => c.certificateStatus === 'Generated').length

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/organizer/certificates" className="text-blue-600 hover:underline mb-2 inline-block">
          ← Back to Templates
        </Link>
        <h1 className="text-3xl font-bold mb-2">Bulk Certificate Generation</h1>
        <p className="text-xl text-gray-800 font-semibold mb-2">
          {template?.templateName}
        </p>
        {template?.event && (
          <p className="text-gray-600">
            Event: <span className="font-semibold">{template.event.name}</span>
          </p>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Contestants</p>
          <p className="text-2xl font-bold text-blue-900">{contestants.length}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-600 font-medium">Pending Generation</p>
          <p className="text-2xl font-bold text-yellow-900">{notGeneratedCount}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Generated</p>
          <p className="text-2xl font-bold text-green-900">{generatedCount}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        {isGenerating && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Generating certificates: {generationProgress.current} of {generationProgress.total}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round((generationProgress.current / generationProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              {selectedContestants.length} selected
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={contestants.length === 0 || isGenerating}
            >
              {selectedContestants.length === contestants.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleGenerateCertificates}
              disabled={selectedContestants.length === 0 || isGenerating}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating {generationProgress.current}/{generationProgress.total}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Selected ({selectedContestants.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contestants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedContestants.length === contestants.length && contestants.length > 0}
                  onChange={handleSelectAll}
                  disabled={contestants.length === 0}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IC Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contingent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contestants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No contestants with attendance status "Present" found for this event.
                </td>
              </tr>
            ) : (
              contestants.map((contestant) => {
                // Determine row background color based on generation status
                let rowClassName = ''
                if (contestant.generationStatus === 'generating') {
                  rowClassName = 'bg-blue-100 animate-pulse'
                } else if (contestant.generationStatus === 'completed') {
                  rowClassName = 'bg-green-50'
                } else if (contestant.generationStatus === 'failed') {
                  rowClassName = 'bg-red-50'
                } else if (contestant.certificateStatus === 'Generated') {
                  rowClassName = 'bg-green-50'
                }

                return (
                  <tr key={contestant.id} className={rowClassName}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedContestants.includes(contestant.id)}
                        onChange={() => handleSelect(contestant.id)}
                        disabled={isGenerating}
                        className="rounded border-gray-300 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {contestant.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {contestant.ic}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {contestant.contingent.name}
                    </td>
                    <td className="px-6 py-4">
                      {contestant.generationStatus === 'generating' ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </span>
                      ) : contestant.generationStatus === 'completed' ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Just Generated
                        </span>
                      ) : contestant.generationStatus === 'failed' ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Failed
                        </span>
                      ) : contestant.certificateStatus === 'Generated' ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Generated
                        </span>
                      ) : contestant.certificateStatus === 'Listed' ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Listed
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          Not Generated
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 bg-green-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="ml-4 text-lg font-semibold text-gray-900">
                  Generate Certificates
                </h3>
              </div>

              {/* Modal Content */}
              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  You are about to generate certificates for <span className="font-semibold text-gray-900">{selectedContestants.length}</span> contestant{selectedContestants.length !== 1 ? 's' : ''}.
                </p>
                {(() => {
                  const selectedWithStatus = contestants.filter(c => selectedContestants.includes(c.id))
                  const toRegenerate = selectedWithStatus.filter(c => c.certificateStatus === 'Generated').length
                  const toGenerate = selectedContestants.length - toRegenerate
                  
                  return (
                    <>
                      {toGenerate > 0 && toRegenerate > 0 && (
                        <p className="text-sm text-gray-500 mb-1">
                          • {toGenerate} new certificate{toGenerate !== 1 ? 's' : ''} will be created
                        </p>
                      )}
                      {toRegenerate > 0 && (
                        <p className="text-sm text-orange-600 mb-1">
                          • {toRegenerate} existing certificate{toRegenerate !== 1 ? 's' : ''} will be regenerated (serial numbers preserved)
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-2">
                        Do you want to continue?
                      </p>
                    </>
                  )
                })()}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmGeneration}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Generate Certificates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
