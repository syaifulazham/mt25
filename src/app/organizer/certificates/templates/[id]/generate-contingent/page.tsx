'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Download, FileCheck, Search, Users, Building2, MapPin, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface Contingent {
  id: number
  name: string
  contingentType: 'SCHOOL' | 'INDEPENDENT'
  stateId: number | null
  stateName: string | null
  contestantsCount: number
  zoneTeamsCount: number
  nationalTeamsCount: number
  certificate: {
    id: number
    filePath: string
    serialNumber: string | null
  } | null
}

interface State {
  id: number
  name: string
}

export default function GenerateContingentCertificatesPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const templateId = parseInt(params.id as string)

  const [contingents, setContingents] = useState<Contingent[]>([])
  const [filteredContingents, setFilteredContingents] = useState<Contingent[]>([])
  const [states, setStates] = useState<State[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0, contingentName: '' })
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SCHOOL' | 'INDEPENDENT'>('ALL')
  const [stateFilter, setStateFilter] = useState<number | 'ALL'>('ALL')
  const [showOnlyWithContestants, setShowOnlyWithContestants] = useState(true)
  const [showOnlyWithZoneTeams, setShowOnlyWithZoneTeams] = useState(true)
  const [showOnlyWithNationalTeams, setShowOnlyWithNationalTeams] = useState(false)
  
  // Selection
  const [selectedContingents, setSelectedContingents] = useState<Set<number>>(new Set())
  
  // Sorting
  const [sortField, setSortField] = useState<'name' | 'state' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Modal for viewing certificate
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingCertPath, setViewingCertPath] = useState<string>('')

  useEffect(() => {
    if (status === 'authenticated') {
      fetchContingents()
      fetchStates()
    }
  }, [status, templateId])

  useEffect(() => {
    filterContingents()
  }, [contingents, searchQuery, typeFilter, stateFilter, showOnlyWithContestants, showOnlyWithZoneTeams, showOnlyWithNationalTeams, sortField, sortDirection])

  const fetchContingents = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/certificates/templates/${templateId}/contingents`)
      if (!response.ok) throw new Error('Failed to fetch contingents')
      
      const data = await response.json()
      setContingents(data)
    } catch (error) {
      console.error('Error fetching contingents:', error)
      toast.error('Failed to load contingents')
    } finally {
      setLoading(false)
    }
  }

  const fetchStates = async () => {
    try {
      const response = await fetch('/api/states')
      if (!response.ok) throw new Error('Failed to fetch states')
      
      const data = await response.json()
      setStates(data)
    } catch (error) {
      console.error('Error fetching states:', error)
    }
  }

  const filterContingents = () => {
    let filtered = [...contingents]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query)
      )
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(c => c.contingentType === typeFilter)
    }

    // State filter
    if (stateFilter !== 'ALL') {
      filtered = filtered.filter(c => c.stateId === stateFilter)
    }

    // Contestants filter
    if (showOnlyWithContestants) {
      filtered = filtered.filter(c => c.contestantsCount > 0)
    }

    // Zone teams filter
    if (showOnlyWithZoneTeams) {
      filtered = filtered.filter(c => c.zoneTeamsCount > 0)
    }

    // National teams filter
    if (showOnlyWithNationalTeams) {
      filtered = filtered.filter(c => c.nationalTeamsCount > 0)
    }

    // Sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue = ''
        let bValue = ''
        
        if (sortField === 'name') {
          aValue = cleanContingentName(a.name).toLowerCase()
          bValue = cleanContingentName(b.name).toLowerCase()
        } else if (sortField === 'state') {
          aValue = (a.stateName || '').toLowerCase()
          bValue = (b.stateName || '').toLowerCase()
        }
        
        if (sortDirection === 'asc') {
          return aValue.localeCompare(bValue)
        } else {
          return bValue.localeCompare(aValue)
        }
      })
    }

    setFilteredContingents(filtered)
  }

  const cleanContingentName = (name: string): string => {
    return name
      .replace(/\bContingent\b/gi, '')
      .replace(/\bKontinjen\b/gi, '')
      .trim()
  }

  const handleSelectAll = () => {
    // Allow selecting all contingents for generation/regeneration
    if (selectedContingents.size === filteredContingents.length) {
      setSelectedContingents(new Set())
    } else {
      setSelectedContingents(new Set(filteredContingents.map(c => c.id)))
    }
  }

  const handleSelectContingent = (contingentId: number) => {
    const newSelected = new Set(selectedContingents)
    if (newSelected.has(contingentId)) {
      newSelected.delete(contingentId)
    } else {
      newSelected.add(contingentId)
    }
    setSelectedContingents(newSelected)
  }

  const handleGenerateSingle = async (contingentId: number) => {
    try {
      setGenerating(true)
      const response = await fetch(`/api/certificates/templates/${templateId}/generate-contingent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contingentIds: [contingentId] })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate certificate')
      }

      const result = await response.json()
      toast.success(`Certificate processed successfully`)
      fetchContingents() // Refresh list
    } catch (error: any) {
      console.error('Error generating certificate:', error)
      toast.error(error.message || 'Failed to generate certificate')
    } finally {
      setGenerating(false)
    }
  }

  const handleBulkGenerate = async () => {
    if (selectedContingents.size === 0) {
      toast.error('Please select at least one contingent')
      return
    }

    const contingentIdsArray = Array.from(selectedContingents)
    const total = contingentIdsArray.length
    let successCount = 0
    let failedCount = 0
    const errors: { contingentId: number; error: string }[] = []

    try {
      setGenerating(true)
      setGeneratingProgress({ current: 0, total, contingentName: '' })

      // Generate certificates one by one to show progress
      for (let i = 0; i < contingentIdsArray.length; i++) {
        const contingentId = contingentIdsArray[i]
        const contingent = contingents.find(c => c.id === contingentId)
        const contingentName = contingent ? cleanContingentName(contingent.name) : `ID ${contingentId}`

        setGeneratingProgress({ current: i + 1, total, contingentName })

        try {
          const response = await fetch(`/api/certificates/templates/${templateId}/generate-contingent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contingentIds: [contingentId] })
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to generate certificate')
          }

          const result = await response.json()
          if (result.successCount > 0) {
            successCount++
          } else {
            failedCount++
            if (result.errors && result.errors.length > 0) {
              errors.push(...result.errors)
            }
          }
        } catch (error: any) {
          failedCount++
          errors.push({ contingentId, error: error.message || 'Unknown error' })
        }
      }

      // Show final results
      if (successCount > 0) {
        toast.success(`Processed ${successCount} certificate(s) successfully`)
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} certificate(s) failed to process`)
        console.error('Processing errors:', errors)
      }
      
      setSelectedContingents(new Set())
      fetchContingents() // Refresh list
    } catch (error: any) {
      console.error('Error generating certificates:', error)
      toast.error(error.message || 'Failed to generate certificates')
    } finally {
      setGenerating(false)
      setGeneratingProgress({ current: 0, total: 0, contingentName: '' })
    }
  }

  const handleBulkDownload = async () => {
    const certificatesToDownload = filteredContingents.filter(c => 
      c.certificate && selectedContingents.has(c.id)
    )

    if (certificatesToDownload.length === 0) {
      toast.error('No certificates available to download')
      return
    }

    for (const contingent of certificatesToDownload) {
      if (contingent.certificate) {
        const link = document.createElement('a')
        link.href = `/api/certificates/${contingent.certificate.id}/download`
        link.download = `Certificate_${cleanContingentName(contingent.name)}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    toast.success('Download complete')
  }

  const handleViewCertificate = (certificateId: number) => {
    setViewingCertPath(`/api/certificates/${certificateId}/view`)
    setViewModalOpen(true)
  }

  const closeViewModal = () => {
    setViewModalOpen(false)
    setViewingCertPath('')
  }

  const handleSort = (field: 'name' | 'state') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: 'name' | 'state') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 inline" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 inline" />
      : <ArrowDown className="h-3 w-3 ml-1 inline" />
  }

  const stats = {
    total: filteredContingents.length,
    generated: filteredContingents.filter(c => c.certificate).length,
    pending: filteredContingents.filter(c => !c.certificate).length,
    selected: selectedContingents.size
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contingents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-purple-600 hover:text-purple-700 font-medium flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Templates
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Generate Contingent Certificates</h1>
          <p className="mt-2 text-gray-600">
            Generate certificates for contingents (team/group level)
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Users className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <FileCheck className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Generated</p>
                <p className="text-2xl font-bold text-gray-900">{stats.generated}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <Users className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <Users className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Selected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.selected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contingent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="ALL">All Types</option>
                <option value="SCHOOL">School</option>
                <option value="INDEPENDENT">Independent</option>
              </select>
            </div>

            {/* State Filter */}
            <div>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="ALL">All States</option>
                {states.map(state => (
                  <option key={state.id} value={state.id}>{state.name}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleBulkGenerate}
                disabled={selectedContingents.size === 0 || generating}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4 mr-2" />
                    Generate/Regenerate ({selectedContingents.size})
                  </>
                )}
              </button>
              
              <button
                onClick={handleBulkDownload}
                disabled={selectedContingents.size === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        {generating && generatingProgress.total > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-3"></div>
                <span className="text-sm font-medium text-gray-900">
                  Generating certificates... {generatingProgress.current} of {generatingProgress.total}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {Math.round((generatingProgress.current / generatingProgress.total) * 100)}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div 
                className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(generatingProgress.current / generatingProgress.total) * 100}%` }}
              ></div>
            </div>
            
            {/* Current Contingent */}
            {generatingProgress.contingentName && (
              <p className="text-xs text-gray-500">
                Currently processing: <span className="font-medium text-gray-700">{generatingProgress.contingentName}</span>
              </p>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        filteredContingents.length > 0 &&
                        selectedContingents.size === filteredContingents.length
                      }
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('name')}
                      className={`text-xs font-medium uppercase tracking-wider transition-colors flex items-center ${
                        sortField === 'name'
                          ? 'text-purple-600 font-bold'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Contingent Name
                      {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('state')}
                      className={`text-xs font-medium uppercase tracking-wider transition-colors flex items-center ${
                        sortField === 'state'
                          ? 'text-purple-600 font-bold'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      State
                      {getSortIcon('state')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center">
                    <button
                      onClick={() => setShowOnlyWithContestants(!showOnlyWithContestants)}
                      className={`text-xs font-medium uppercase tracking-wider transition-colors ${
                        showOnlyWithContestants
                          ? 'text-purple-600 font-bold'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Contestants {showOnlyWithContestants && '> 0'}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center">
                    <button
                      onClick={() => setShowOnlyWithZoneTeams(!showOnlyWithZoneTeams)}
                      className={`text-xs font-medium uppercase tracking-wider transition-colors ${
                        showOnlyWithZoneTeams
                          ? 'text-purple-600 font-bold'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Zone Teams {showOnlyWithZoneTeams && '> 0'}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center">
                    <button
                      onClick={() => setShowOnlyWithNationalTeams(!showOnlyWithNationalTeams)}
                      className={`text-xs font-medium uppercase tracking-wider transition-colors ${
                        showOnlyWithNationalTeams
                          ? 'text-purple-600 font-bold'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      National Teams {showOnlyWithNationalTeams && '> 0'}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Certificate
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContingents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      No contingents found
                    </td>
                  </tr>
                ) : (
                  filteredContingents.map((contingent) => (
                    <tr
                      key={contingent.id}
                      className={`hover:bg-gray-50 ${
                        contingent.certificate ? 'bg-green-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedContingents.has(contingent.id)}
                          onChange={() => handleSelectContingent(contingent.id)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                            contingent.contingentType === 'SCHOOL'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                          title={contingent.contingentType === 'SCHOOL' ? 'School' : 'Independent'}
                        >
                          {contingent.contingentType === 'SCHOOL' ? (
                            <Building2 className="h-4 w-4" />
                          ) : (
                            <Users className="h-4 w-4" />
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {cleanContingentName(contingent.name)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {contingent.stateName || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">{contingent.contestantsCount}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">{contingent.zoneTeamsCount}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">{contingent.nationalTeamsCount}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {contingent.certificate ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileCheck className="h-5 w-5 text-green-600" />
                            <button
                              onClick={() => handleViewCertificate(contingent.certificate!.id)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              View
                            </button>
                            <a
                              href={`/api/certificates/${contingent.certificate.id}/download`}
                              className="text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not generated</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleGenerateSingle(contingent.id)}
                          disabled={generating}
                          className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {generating ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              <span className="text-xs">Processing...</span>
                            </>
                          ) : (
                            contingent.certificate ? 'Regenerate' : 'Generate'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Certificate View Modal */}
      {viewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={closeViewModal}>
          <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Certificate Preview</h3>
              <button
                onClick={closeViewModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* PDF Viewer */}
            <div className="w-full h-[calc(100%-4rem)] p-4">
              <iframe
                src={viewingCertPath}
                className="w-full h-full border-0 rounded"
                title="Certificate Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
