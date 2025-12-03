'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, X, Download, Search } from 'lucide-react'

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
  const [viewCertificateId, setViewCertificateId] = useState<number | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [ignoreAttendance, setIgnoreAttendance] = useState(false)
  const [generateWithoutFiles, setGenerateWithoutFiles] = useState(true) // On-demand by default
  const [searchQuery, setSearchQuery] = useState('')
  const [showBulkDownloadModal, setShowBulkDownloadModal] = useState(false)
  const [mergingType, setMergingType] = useState<'split' | 'merge_all' | 'merge_by_contingent' | 'merge_by_state' | 'merge_every_n'>('split')
  const [downloadType, setDownloadType] = useState<'single_folder' | 'state_folders'>('single_folder')
  const [mergeEveryN, setMergeEveryN] = useState<number>(10)
  const [isDownloading, setIsDownloading] = useState(false)

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
          `/api/certificates/templates/${templateId}/contestants-for-generation?ignoreAttendance=${ignoreAttendance}`
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
  }, [templateId, ignoreAttendance])

  // Filter contestants based on search query
  const filteredContestants = useMemo(() => {
    if (!searchQuery.trim()) {
      return contestants
    }
    
    const query = searchQuery.toLowerCase()
    return contestants.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.contingent.name.toLowerCase().includes(query) ||
      c.ic.toLowerCase().includes(query)
    )
  }, [contestants, searchQuery])

  // Handle select all (includes all filtered contestants for regeneration support)
  const handleSelectAll = () => {
    if (selectedContestants.length === filteredContestants.length) {
      setSelectedContestants([])
    } else {
      setSelectedContestants(filteredContestants.map(c => c.id))
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
          body: JSON.stringify({ 
            contestantIds: [contestantId],
            generateWithoutFiles
          })
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

  const notGeneratedCount = filteredContestants.filter(c => !c.certificateStatus || c.certificateStatus === 'Listed').length
  const generatedCount = filteredContestants.filter(c => c.certificateStatus === 'Generated').length

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/organizer/certificates" className="text-blue-600 hover:underline mb-2 inline-block">
          ← Back to Templates
        </Link>
        <div className="flex justify-between items-start">
          <div>
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
          <div className="flex flex-col gap-3">
            {/* Ignore Attendance Toggle */}
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              <label htmlFor="ignore-attendance" className="text-sm font-medium text-gray-700 cursor-pointer">
                Ignore Attendance Status
              </label>
              <button
                id="ignore-attendance"
                type="button"
                onClick={() => setIgnoreAttendance(!ignoreAttendance)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  ignoreAttendance ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                disabled={isGenerating}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    ignoreAttendance ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              {ignoreAttendance && (
                <span className="text-xs text-amber-600 font-medium">All contestants shown</span>
              )}
            </div>

            {/* On-Demand Generation Toggle */}
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              <label htmlFor="generate-mode" className="text-sm font-medium text-gray-700 cursor-pointer">
                On-Demand Generation
              </label>
              <button
                id="generate-mode"
                type="button"
                onClick={() => setGenerateWithoutFiles(!generateWithoutFiles)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                  generateWithoutFiles ? 'bg-green-600' : 'bg-gray-200'
                }`}
                disabled={isGenerating}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    generateWithoutFiles ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs font-medium ${generateWithoutFiles ? 'text-green-600' : 'text-gray-600'}`}>
                {generateWithoutFiles ? 'No physical files' : 'Save physical files'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Contestants</p>
          <p className="text-2xl font-bold text-blue-900">{filteredContestants.length}</p>
          {searchQuery && (
            <p className="text-xs text-gray-500 mt-1">of {contestants.length} total</p>
          )}
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

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, contingent, or IC number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isGenerating}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-600 mt-2">
            Showing {filteredContestants.length} of {contestants.length} contestants
          </p>
        )}
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
              disabled={filteredContestants.length === 0 || isGenerating}
            >
              {selectedContestants.length === filteredContestants.length && filteredContestants.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={() => setShowBulkDownloadModal(true)}
              disabled={generatedCount === 0}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center mr-2"
            >
              <Download className="h-5 w-5 mr-1" />
              Bulk Download ({generatedCount})
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
                  checked={selectedContestants.length === filteredContestants.length && filteredContestants.length > 0}
                  onChange={handleSelectAll}
                  disabled={filteredContestants.length === 0}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredContestants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  {searchQuery ? (
                    <>
                      No contestants match your search "{searchQuery}".
                      <button
                        onClick={() => setSearchQuery('')}
                        className="ml-2 text-blue-600 hover:underline"
                      >
                        Clear search
                      </button>
                    </>
                  ) : (
                    ignoreAttendance 
                      ? 'No contestants found for this event.'
                      : 'No contestants with attendance status "Present" found for this event.'
                  )}
                </td>
              </tr>
            ) : (
              filteredContestants.map((contestant) => {
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
                    <td className="px-6 py-4">
                      {contestant.certificateStatus === 'Generated' && contestant.certificateId && (
                        <button
                          onClick={() => {
                            setViewCertificateId(contestant.certificateId!)
                            setShowViewModal(true)
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="View Certificate"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
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

      {/* Bulk Download Modal */}
      {showBulkDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-full p-3">
                    <Download className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="ml-4 text-lg font-semibold text-gray-900">
                    Bulk Download Certificates
                  </h3>
                </div>
                <button
                  onClick={() => setShowBulkDownloadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="space-y-6">
                {/* Merging Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    PDF Merging Type
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="mergingType"
                        value="split"
                        checked={mergingType === 'split'}
                        onChange={(e) => setMergingType(e.target.value as any)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-3 text-sm">
                        <span className="font-medium text-gray-900">Split PDF</span>
                        <span className="block text-gray-500">Each certificate as a separate PDF file</span>
                      </span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="mergingType"
                        value="merge_all"
                        checked={mergingType === 'merge_all'}
                        onChange={(e) => setMergingType(e.target.value as any)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-3 text-sm">
                        <span className="font-medium text-gray-900">Merge All in a Single PDF</span>
                        <span className="block text-gray-500">All certificates combined into one PDF file</span>
                      </span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="mergingType"
                        value="merge_by_contingent"
                        checked={mergingType === 'merge_by_contingent'}
                        onChange={(e) => setMergingType(e.target.value as any)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-3 text-sm">
                        <span className="font-medium text-gray-900">Merge by Contingent</span>
                        <span className="block text-gray-500">One merged PDF per contingent</span>
                      </span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="mergingType"
                        value="merge_by_state"
                        checked={mergingType === 'merge_by_state'}
                        onChange={(e) => setMergingType(e.target.value as any)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-3 text-sm">
                        <span className="font-medium text-gray-900">Merge by State</span>
                        <span className="block text-gray-500">One merged PDF per state (SELANGOR, PERAK, etc.)</span>
                      </span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="mergingType"
                        value="merge_every_n"
                        checked={mergingType === 'merge_every_n'}
                        onChange={(e) => setMergingType(e.target.value as any)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-3 text-sm flex-1">
                        <span className="font-medium text-gray-900">Merge Every N Files</span>
                        <span className="block text-gray-500">Batch merge certificates</span>
                      </span>
                      {mergingType === 'merge_every_n' && (
                        <input
                          type="number"
                          min="2"
                          max="100"
                          value={mergeEveryN}
                          onChange={(e) => setMergeEveryN(parseInt(e.target.value) || 10)}
                          className="ml-3 w-20 px-2 py-1 border rounded text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </label>
                  </div>
                </div>

                {/* Download Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Folder Structure
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="downloadType"
                        value="single_folder"
                        checked={downloadType === 'single_folder'}
                        onChange={(e) => setDownloadType(e.target.value as any)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-3 text-sm">
                        <span className="font-medium text-gray-900">All in a Single Folder</span>
                        <span className="block text-gray-500">Flat structure with all files in one folder</span>
                      </span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="downloadType"
                        value="state_folders"
                        checked={downloadType === 'state_folders'}
                        onChange={(e) => setDownloadType(e.target.value as any)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-3 text-sm">
                        <span className="font-medium text-gray-900">Group in State/Contingent Folders</span>
                        <span className="block text-gray-500">Organized in folders by state/contingent</span>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Download Summary:</span> {generatedCount} certificate(s) will be downloaded as a ZIP file.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowBulkDownloadModal(false)}
                  disabled={isDownloading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsDownloading(true)
                    try {
                      const response = await fetch(`/api/certificates/templates/${templateId}/bulk-download`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          mergingType,
                          downloadType,
                          mergeEveryN: mergingType === 'merge_every_n' ? mergeEveryN : undefined
                        })
                      })

                      if (!response.ok) {
                        throw new Error('Failed to download certificates')
                      }

                      // Download the ZIP file
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `certificates-${template?.templateName || 'bulk'}-${Date.now()}.zip`
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)

                      setShowBulkDownloadModal(false)
                    } catch (error) {
                      console.error('Download error:', error)
                      alert('Failed to download certificates. Please try again.')
                    } finally {
                      setIsDownloading(false)
                    }
                  }}
                  disabled={isDownloading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center"
                >
                  {isDownloading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Preparing Download...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download ZIP
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Certificate Modal */}
      {showViewModal && viewCertificateId && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">View Certificate</h3>
              <button
                onClick={() => {
                  setShowViewModal(false)
                  setViewCertificateId(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content - PDF Viewer */}
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
              <iframe
                src={`/api/certificates/${viewCertificateId}/view`}
                className="w-full h-full min-h-[600px] border-0 rounded"
                title="Certificate Preview"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-4 border-t bg-gray-50">
              <a
                href={`/api/certificates/${viewCertificateId}/download`}
                download
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Certificate
              </a>
              <button
                onClick={() => {
                  setShowViewModal(false)
                  setViewCertificateId(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
