'use client'

import { useState, useEffect } from 'react'
import { Download, FileCheck, Loader2, X, AlertCircle, ExternalLink, Search } from 'lucide-react'

interface Certificate {
  id: number
  templateName: string
  targetType: string
  filePath: string | null
  uniqueCode: string
}

interface Contestant {
  id: number
  contestantId: number
  name: string
  ic: string
  class: string
  team: string | null
  teamId: number | null
  contingent: string
  certificates: {
    school: Certificate | null
    state: Certificate[]
    online: Certificate[]
    national: Certificate[]
    quiz: Certificate[]
  }
}

interface PrerequisiteModalData {
  contestantName: string
  teamId: number | null
  incomplete: string[]
  detailedMessage: string
}

export default function CertificatesPage() {
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [filteredContestants, setFilteredContestants] = useState<Contestant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [prerequisiteModal, setPrerequisiteModal] = useState<PrerequisiteModalData | null>(null)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSchool, setFilterSchool] = useState(false)
  const [filterState, setFilterState] = useState(false)
  const [filterOnline, setFilterOnline] = useState(false)
  const [filterNational, setFilterNational] = useState(false)

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showOnlinePenyertaanModal, setShowOnlinePenyertaanModal] = useState(false)
  const [showOnlinePencapaianModal, setShowOnlinePencapaianModal] = useState(false)
  const [showStatePenyertaanModal, setShowStatePenyertaanModal] = useState(false)
  const [showStatePencapaianModal, setShowStatePencapaianModal] = useState(false)
  const [showNationalPenyertaanModal, setShowNationalPenyertaanModal] = useState(false)
  const [showNationalPencapaianModal, setShowNationalPencapaianModal] = useState(false)
  const [showQuizPenyertaanModal, setShowQuizPenyertaanModal] = useState(false)
  const [showQuizPencapaianModal, setShowQuizPencapaianModal] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{
    total: number
    current: number
    action: string
  } | null>(null)
  const [resultModal, setResultModal] = useState<{
    downloaded: number
    skipped: Array<{ name: string, reason: string }>
  } | null>(null)

  useEffect(() => {
    fetchContestants()
  }, [])

  useEffect(() => {
    applyFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestants, searchQuery, filterSchool, filterState, filterOnline, filterNational])

  const fetchContestants = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/participants/contestants/certificates')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setContestants(data.contestants || [])
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...contestants]

    // Search filter (name, IC, team)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.ic.toLowerCase().includes(query) ||
        (c.team && c.team.toLowerCase().includes(query))
      )
    }

    // Certificate availability filters
    const hasAnyFilter = filterSchool || filterState || filterOnline || filterNational
    
    if (hasAnyFilter) {
      filtered = filtered.filter(c => {
        const matches = []
        
        if (filterSchool) matches.push(c.certificates.school !== null)
        if (filterState) matches.push(c.certificates.state.length > 0)
        if (filterOnline) matches.push(c.certificates.online.length > 0)
        if (filterNational) matches.push(c.certificates.national.length > 0)
        
        // Return true if ANY of the selected filters match
        return matches.some(match => match)
      })
    }

    setFilteredContestants(filtered)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterSchool(false)
    setFilterState(false)
    setFilterOnline(false)
    setFilterNational(false)
  }

  // Selection handlers
  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContestants.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredContestants.map(c => c.id)))
    }
  }

  const getSelectedContestants = () => {
    return contestants.filter(c => selectedIds.has(c.id))
  }

  // Bulk actions
  const handleBulkGenerate = async (all: boolean) => {
    const targets = all ? filteredContestants : getSelectedContestants()
    
    if (targets.length === 0) {
      alert('Tiada peserta dipilih')
      return
    }

    setBulkProgress({ total: targets.length, current: 0, action: 'Generating...' })

    try {
      for (let i = 0; i < targets.length; i++) {
        const contestant = targets[i]
        setBulkProgress({ total: targets.length, current: i + 1, action: 'Generating...' })
        
        // Call generate API for each contestant
        const response = await fetch(`/api/participants/contestants/${contestant.contestantId}/generate-certificate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateType: 'GENERAL' })
        })

        if (!response.ok) {
          console.error(`Failed to generate for ${contestant.name}`)
        }
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      setBulkProgress(null)
      alert(`Selesai! ${targets.length} sijil telah dijana.`)
      fetchContestants() // Refresh data
    } catch (error) {
      console.error('Bulk generate error:', error)
      alert('Ralat semasa menjana sijil')
      setBulkProgress(null)
    }
  }

  const handleBulkDownload = async (all: boolean) => {
    const targets = all ? filteredContestants : getSelectedContestants()
    const certsToDownload = targets.filter(c => c.certificates.school?.filePath)
    
    if (certsToDownload.length === 0) {
      alert('Tiada sijil tersedia untuk dimuat turun')
      return
    }

    setBulkProgress({ total: certsToDownload.length, current: 0, action: 'Checking prerequisites...' })

    try {
      // Using JSZip for client-side zip creation
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      
      const skipped: Array<{ name: string, reason: string }> = []
      let downloaded = 0

      for (let i = 0; i < certsToDownload.length; i++) {
        const contestant = certsToDownload[i]
        const cert = contestant.certificates.school!
        
        setBulkProgress({ total: certsToDownload.length, current: i + 1, action: 'Checking prerequisites...' })

        // Check prerequisites
        try {
          const prereqResponse = await fetch('/api/participants/contestants/certificates/check-prerequisites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              certificateId: cert.id,
              contestantId: contestant.contestantId
            })
          })

          const prereqResult = await prereqResponse.json()

          if (!prereqResult.canDownload) {
            // Skip this certificate
            const reasons = prereqResult.incomplete?.join(', ') || 'Prasyarat tidak lengkap'
            skipped.push({ name: contestant.name, reason: reasons })
            continue
          }

          // Prerequisites met, download the certificate
          setBulkProgress({ total: certsToDownload.length, current: i + 1, action: 'Downloading...' })
          const response = await fetch(`/api/certificates/download/${cert.id}`)
          if (!response.ok) {
            console.error(`Failed to download certificate ${cert.id}`)
            skipped.push({ 
              name: contestant.name, 
              reason: 'Gagal memuat turun fail sijil' 
            })
            continue
          }
          const blob = await response.blob()
          const fileName = `${contestant.name.replace(/[^a-zA-Z0-9]/g, '_')}_${cert.uniqueCode}.pdf`
          zip.file(fileName, blob)
          downloaded++
        } catch (error) {
          console.error(`Failed to download cert for ${contestant.name}`, error)
          skipped.push({ name: contestant.name, reason: 'Ralat semasa memuat turun' })
        }
      }

      if (downloaded === 0) {
        setBulkProgress(null)
        setResultModal({ downloaded: 0, skipped })
        return
      }

      // Generate zip file
      setBulkProgress({ total: certsToDownload.length, current: certsToDownload.length, action: 'Creating ZIP...' })
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      
      // Download zip
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = `Sijil_Sekolah_${new Date().getTime()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setBulkProgress(null)
      
      // Show results modal
      setResultModal({ downloaded, skipped })
    } catch (error) {
      console.error('Bulk download error:', error)
      alert('Ralat semasa memuat turun sijil')
      setBulkProgress(null)
    }
  }

  const handleBulkDownloadByType = async (
    all: boolean, 
    targetType: 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 'QUIZ_PARTICIPANT' | 'QUIZ_WINNER',
    certType: 'state' | 'national' | 'online' | 'quiz'
  ) => {
    const targets = all ? filteredContestants : getSelectedContestants()
    
    // Collect certificates matching the targetType and certType
    const certsData: Array<{ contestant: Contestant, cert: Certificate }> = []
    targets.forEach(contestant => {
      let certs: Certificate[] = []
      if (certType === 'state') {
        certs = contestant.certificates.state
      } else if (certType === 'national') {
        certs = contestant.certificates.national
      } else if (certType === 'quiz') {
        certs = contestant.certificates.quiz
      } else {
        certs = contestant.certificates.online
      }
      
      const matchingCerts = certs.filter(
        cert => cert.targetType === targetType && cert.filePath
      )
      matchingCerts.forEach(cert => {
        certsData.push({ contestant, cert })
      })
    })
    
    if (certsData.length === 0) {
      alert('Tiada sijil tersedia untuk dimuat turun')
      return
    }

    setBulkProgress({ total: certsData.length, current: 0, action: 'Checking prerequisites...' })

    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      
      const skipped: Array<{ name: string, reason: string }> = []
      let downloaded = 0

      for (let i = 0; i < certsData.length; i++) {
        const { contestant, cert } = certsData[i]
        
        setBulkProgress({ total: certsData.length, current: i + 1, action: 'Checking prerequisites...' })

        // Check prerequisites
        try {
          const prereqResponse = await fetch('/api/participants/contestants/certificates/check-prerequisites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              certificateId: cert.id,
              contestantId: contestant.contestantId
            })
          })

          const prereqResult = await prereqResponse.json()

          if (!prereqResult.canDownload) {
            // Skip this certificate
            const reasons = prereqResult.incomplete?.join(', ') || 'Prasyarat tidak lengkap'
            skipped.push({ name: contestant.name, reason: reasons })
            continue
          }

          // Prerequisites met, download the certificate
          setBulkProgress({ total: certsData.length, current: i + 1, action: 'Downloading...' })
          const response = await fetch(`/api/certificates/download/${cert.id}`)
          if (!response.ok) {
            console.error(`Failed to download certificate ${cert.id}`)
            skipped.push({ 
              name: contestant.name, 
              reason: 'Gagal memuat turun fail sijil' 
            })
            continue
          }
          const blob = await response.blob()
          const fileName = `${contestant.name.replace(/[^a-zA-Z0-9]/g, '_')}_${cert.uniqueCode}.pdf`
          zip.file(fileName, blob)
          downloaded++
        } catch (error) {
          console.error(`Failed to download cert for ${contestant.name}`, error)
          skipped.push({ name: contestant.name, reason: 'Ralat semasa memuat turun' })
        }
      }

      if (downloaded === 0) {
        setBulkProgress(null)
        setResultModal({ downloaded: 0, skipped })
        return
      }

      // Generate zip file
      setBulkProgress({ total: certsData.length, current: certsData.length, action: 'Creating ZIP...' })
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      
      // Download zip
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      const typeName = (targetType === 'EVENT_PARTICIPANT' || targetType === 'QUIZ_PARTICIPANT') ? 'Penyertaan' : 'Pencapaian'
      const certTypeName = certType === 'state' ? 'Negeri' : certType === 'national' ? 'Kebangsaan' : certType === 'quiz' ? 'Kuiz' : 'Online'
      link.download = `Sijil_${certTypeName}_${typeName}_${new Date().getTime()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setBulkProgress(null)
      
      // Show results modal
      setResultModal({ downloaded, skipped })
    } catch (error) {
      console.error('Bulk download error:', error)
      alert('Ralat semasa memuat turun sijil')
      setBulkProgress(null)
    }
  }

  const handleDownload = async (cert: Certificate, level: string, contestantId: number, contestantName: string, teamId: number | null) => {
    if (!cert.filePath) {
      alert('Certificate file not available')
      return
    }

    const downloadKey = `${cert.id}-${level}`
    setDownloadingId(downloadKey)

    try {
      // Check prerequisites first
      const prereqResponse = await fetch('/api/participants/contestants/certificates/check-prerequisites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificateId: cert.id,
          contestantId: contestantId
        })
      })

      if (!prereqResponse.ok) {
        console.error('Prerequisite check failed:', prereqResponse.status)
        alert('Failed to check prerequisites')
        setDownloadingId(null)
        return
      }

      const prereqResult = await prereqResponse.json()
      
      console.log('Prerequisite check result:', prereqResult)

      if (!prereqResult.canDownload) {
        // Show modal with detailed message about incomplete prerequisites
        setPrerequisiteModal({
          contestantName: contestantName,
          teamId: teamId,
          incomplete: prereqResult.incomplete || [],
          detailedMessage: prereqResult.detailedMessage || 'Prasyarat sijil belum lengkap'
        })
        setDownloadingId(null)
        return
      }

      // Prerequisites completed, download via API endpoint
      const downloadUrl = `/api/certificates/download/${cert.id}`
      
      // Fetch the file
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Download failed:', errorData)
        alert(errorData.error || 'Failed to download certificate')
        setDownloadingId(null)
        return
      }

      // Get the blob and create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `Certificate-${level}-${cert.uniqueCode}.pdf`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download certificate')
    } finally {
      setDownloadingId(null)
    }
  }

  const CertificateButton = ({ cert, level, contestantId, contestantName, teamId }: { 
    cert: Certificate | null; 
    level: string; 
    contestantId: number;
    contestantName: string;
    teamId: number | null;
  }) => {
    const downloadKey = cert ? `${cert.id}-${level}` : ''
    const isDownloading = downloadingId === downloadKey

    if (!cert) {
      return (
        <div className="text-center text-sm text-gray-400 italic">
          -
        </div>
      )
    }

    // Green background for winner certificates
    const isWinner = cert.targetType === 'EVENT_WINNER'
    const bgColor = isWinner 
      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400' 
      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'

    return (
      <button
        onClick={() => handleDownload(cert, level, contestantId, contestantName, teamId)}
        disabled={isDownloading}
        title={cert.templateName}
        className={`inline-flex items-center justify-center p-2 text-white ${bgColor} rounded-md transition-colors`}
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </button>
    )
  }

  const CertificateButtons = ({ certs, level, contestantId, contestantName, teamId }: { 
    certs: Certificate[]; 
    level: string; 
    contestantId: number;
    contestantName: string;
    teamId: number | null;
  }) => {
    if (!certs || certs.length === 0) {
      return (
        <div className="text-center text-sm text-gray-400 italic">
          -
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center gap-2">
        {certs.map((cert) => (
          <CertificateButton 
            key={cert.id} 
            cert={cert} 
            level={level} 
            contestantId={contestantId}
            contestantName={contestantName}
            teamId={teamId}
          />
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Memuatkan sijil...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileCheck className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Sijil Peserta</h1>
        </div>
        <p className="text-gray-600">
          Senarai peserta dan sijil yang tersedia untuk dimuat turun
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Carian
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Cari nama, IC, atau kumpulan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Certificate Availability Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ketersediaan Sijil
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterSchool}
                  onChange={(e) => setFilterSchool(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Sijil Sekolah</span>
              </label>
              
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterState}
                  onChange={(e) => setFilterState(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Sijil Negeri</span>
              </label>
              
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterOnline}
                  onChange={(e) => setFilterOnline(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Sijil Online</span>
              </label>
              
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterNational}
                  onChange={(e) => setFilterNational(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Sijil Kebangsaan</span>
              </label>
            </div>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || filterSchool || filterState || filterOnline || filterNational) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Padam Semua Penapis
            </button>
            <span className="ml-3 text-sm text-gray-500">
              Menunjukkan {filteredContestants.length} daripada {contestants.length} peserta
            </span>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Jumlah Peserta</p>
          <p className="text-2xl font-bold text-blue-900">{contestants.length}</p>
        </div>
        
        {(() => {
          const schoolCount = contestants.filter(c => c.certificates.school).length
          return (
            <div className="rounded-lg p-4 bg-green-50 border border-green-200">
              <p className="text-sm font-medium text-green-600">Sijil Sekolah</p>
              <p className="text-2xl font-bold text-green-900">
                {schoolCount}
              </p>
              <button
                onClick={() => setShowBulkModal(true)}
                className="mt-3 w-full px-3 py-2 text-white text-sm font-medium rounded-md transition-colors bg-green-600 hover:bg-green-700"
              >
                Tindakan Pukal
              </button>
            </div>
          )
        })()}
        
        {(() => {
          const stateCount = contestants.filter(c => c.certificates.state?.length > 0).length
          const isDisabled = stateCount === 0
          return (
            <div className={`rounded-lg p-4 ${isDisabled ? 'bg-gray-100 border border-gray-300 opacity-60' : 'bg-purple-50 border border-purple-200'}`}>
              <p className={`text-sm font-medium ${isDisabled ? 'text-gray-600' : 'text-purple-600'}`}>Sijil Negeri</p>
              <p className={`text-2xl font-bold ${isDisabled ? 'text-gray-900' : 'text-purple-900'}`}>
                {stateCount}
              </p>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => setShowStatePenyertaanModal(true)}
                  disabled={isDisabled}
                  className={`w-full px-3 py-2 text-white text-xs font-medium rounded-md transition-colors ${
                    isDisabled 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  Tindakan Pukal (Penyertaan)
                </button>
                <button
                  onClick={() => setShowStatePencapaianModal(true)}
                  disabled={isDisabled}
                  className={`w-full px-3 py-2 text-white text-xs font-medium rounded-md transition-colors ${
                    isDisabled 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  Tindakan Pukal (Pencapaian)
                </button>
              </div>
            </div>
          )
        })()}
        
        {(() => {
          const onlineCount = contestants.filter(c => c.certificates.online?.length > 0).length
          const isDisabled = onlineCount === 0
          return (
            <div className={`rounded-lg p-4 ${isDisabled ? 'bg-gray-100 border border-gray-300 opacity-60' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`text-sm font-medium ${isDisabled ? 'text-gray-600' : 'text-amber-600'}`}>Sijil Online</p>
              <p className={`text-2xl font-bold ${isDisabled ? 'text-gray-900' : 'text-amber-900'}`}>
                {onlineCount}
              </p>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => setShowOnlinePenyertaanModal(true)}
                  disabled={isDisabled}
                  className={`w-full px-3 py-2 text-white text-xs font-medium rounded-md transition-colors ${
                    isDisabled 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Tindakan Pukal (Penyertaan)
                </button>
                <button
                  onClick={() => setShowOnlinePencapaianModal(true)}
                  disabled={isDisabled}
                  className={`w-full px-3 py-2 text-white text-xs font-medium rounded-md transition-colors ${
                    isDisabled 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Tindakan Pukal (Pencapaian)
                </button>
              </div>
            </div>
          )
        })()}
        
        {(() => {
          const nationalCount = contestants.filter(c => c.certificates.national?.length > 0).length
          const isDisabled = nationalCount === 0
          return (
            <div className={`rounded-lg p-4 ${isDisabled ? 'bg-gray-100 border border-gray-300 opacity-60' : 'bg-indigo-50 border border-indigo-200'}`}>
              <p className={`text-sm font-medium ${isDisabled ? 'text-gray-600' : 'text-indigo-600'}`}>Sijil Kebangsaan</p>
              <p className={`text-2xl font-bold ${isDisabled ? 'text-gray-900' : 'text-indigo-900'}`}>
                {nationalCount}
              </p>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => setShowNationalPenyertaanModal(true)}
                  disabled={isDisabled}
                  className={`w-full px-3 py-2 text-white text-xs font-medium rounded-md transition-colors ${
                    isDisabled 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  Tindakan Pukal (Penyertaan)
                </button>
                <button
                  onClick={() => setShowNationalPencapaianModal(true)}
                  disabled={isDisabled}
                  className={`w-full px-3 py-2 text-white text-xs font-medium rounded-md transition-colors ${
                    isDisabled 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  Tindakan Pukal (Pencapaian)
                </button>
              </div>
            </div>
          )
        })()}
        
        {(() => {
          const quizCount = contestants.filter(c => c.certificates.quiz?.length > 0).length
          const isDisabled = quizCount === 0
          return (
            <div className={`rounded-lg p-4 ${isDisabled ? 'bg-gray-100 border border-gray-300 opacity-60' : 'bg-teal-50 border border-teal-200'}`}>
              <p className={`text-sm font-medium ${isDisabled ? 'text-gray-600' : 'text-teal-600'}`}>Sijil Kuiz</p>
              <p className={`text-2xl font-bold ${isDisabled ? 'text-gray-900' : 'text-teal-900'}`}>
                {quizCount}
              </p>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => setShowQuizPenyertaanModal(true)}
                  disabled={isDisabled}
                  className={`w-full px-3 py-2 text-white text-xs font-medium rounded-md transition-colors ${
                    isDisabled 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  Tindakan Pukal (Penyertaan)
                </button>
                <button
                  onClick={() => setShowQuizPencapaianModal(true)}
                  disabled={isDisabled}
                  className={`w-full px-3 py-2 text-white text-xs font-medium rounded-md transition-colors ${
                    isDisabled 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  Tindakan Pukal (Pencapaian)
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredContestants.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kelas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kumpulan
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sijil<br/>(Sekolah)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sijil<br/>(Negeri)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sijil<br/>(Online)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sijil<br/>(Kebangsaan)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sijil<br/>(Kuiz)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContestants.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    {contestants.length === 0 ? 'Tiada peserta dijumpai' : 'Tiada peserta yang sepadan dengan penapis'}
                  </td>
                </tr>
              ) : (
                filteredContestants.map((contestant, index) => (
                  <tr key={contestant.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contestant.id)}
                        onChange={() => toggleSelection(contestant.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {contestant.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {contestant.ic}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {contestant.class}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {contestant.team ? (
                        <button
                          onClick={() => setSearchQuery(contestant.team || '')}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                        >
                          {contestant.team}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CertificateButton 
                        cert={contestant.certificates.school} 
                        level="Sekolah"
                        contestantId={contestant.contestantId}
                        contestantName={contestant.name}
                        teamId={contestant.teamId}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CertificateButtons 
                        certs={contestant.certificates.state} 
                        level="Negeri"
                        contestantId={contestant.contestantId}
                        contestantName={contestant.name}
                        teamId={contestant.teamId}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CertificateButtons 
                        certs={contestant.certificates.online} 
                        level="Online"
                        contestantId={contestant.contestantId}
                        contestantName={contestant.name}
                        teamId={contestant.teamId}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CertificateButtons 
                        certs={contestant.certificates.national} 
                        level="Kebangsaan"
                        contestantId={contestant.contestantId}
                        contestantName={contestant.name}
                        teamId={contestant.teamId}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CertificateButtons 
                        certs={contestant.certificates.quiz} 
                        level="Kuiz"
                        contestantId={contestant.contestantId}
                        contestantName={contestant.name}
                        teamId={contestant.teamId}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        Klik butang "Muat Turun" untuk memuat turun sijil peserta
      </div>

      {/* Prerequisite Modal */}
      {prerequisiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Prasyarat Belum Lengkap</h3>
                  <p className="text-sm text-gray-600">{prerequisiteModal.contestantName}</p>
                </div>
              </div>
              <button
                onClick={() => setPrerequisiteModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-sm text-gray-700 mb-4">
                Sila lengkapkan prasyarat berikut sebelum memuat turun sijil:
              </p>
              
              <ul className="space-y-2 mb-6">
                {prerequisiteModal.incomplete.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="flex-1 pt-0.5">{item}</span>
                  </li>
                ))}
              </ul>

              {prerequisiteModal.teamId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-3">
                    Untuk melengkapkan soal selidik, sila klik butang di bawah:
                  </p>
                  <a
                    href={`/participants/teams/${prerequisiteModal.teamId}/members`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Pergi ke Halaman Kumpulan</span>
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setPrerequisiteModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Tindakan Pukal - Sijil Sekolah</h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Dipilih: <span className="font-semibold text-gray-900">{selectedIds.size}</span> peserta
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowBulkModal(false)
                    handleBulkGenerate(true)
                  }}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Jana Semua
                </button>
                
                <button
                  onClick={() => {
                    setShowBulkModal(false)
                    handleBulkGenerate(false)
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Jana Dipilih
                </button>
                
                <button
                  onClick={() => {
                    setShowBulkModal(false)
                    handleBulkDownload(true)
                  }}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Muat Turun Semua
                </button>
                
                <button
                  onClick={() => {
                    setShowBulkModal(false)
                    handleBulkDownload(false)
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Muat Turun Dipilih
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Penyertaan Modal */}
      {showOnlinePenyertaanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Sijil Online - Penyertaan</h3>
              <button
                onClick={() => setShowOnlinePenyertaanModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Dipilih: <span className="font-semibold text-gray-900">{selectedIds.size}</span> peserta
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowOnlinePenyertaanModal(false)
                    handleBulkDownloadByType(true, 'EVENT_PARTICIPANT', 'online')
                  }}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Muat Turun Semua
                </button>
                
                <button
                  onClick={() => {
                    setShowOnlinePenyertaanModal(false)
                    handleBulkDownloadByType(false, 'EVENT_PARTICIPANT', 'online')
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Muat Turun Dipilih
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowOnlinePenyertaanModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Pencapaian Modal */}
      {showOnlinePencapaianModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Sijil Online - Pencapaian</h3>
              <button
                onClick={() => setShowOnlinePencapaianModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Dipilih: <span className="font-semibold text-gray-900">{selectedIds.size}</span> peserta
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowOnlinePencapaianModal(false)
                    handleBulkDownloadByType(true, 'EVENT_WINNER', 'online')
                  }}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Muat Turun Semua
                </button>
                
                <button
                  onClick={() => {
                    setShowOnlinePencapaianModal(false)
                    handleBulkDownloadByType(false, 'EVENT_WINNER', 'online')
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Muat Turun Dipilih
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowOnlinePencapaianModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State Penyertaan Modal */}
      {showStatePenyertaanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Sijil Negeri - Penyertaan</h3>
              <button
                onClick={() => setShowStatePenyertaanModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Dipilih: <span className="font-semibold text-gray-900">{selectedIds.size}</span> peserta
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowStatePenyertaanModal(false)
                    handleBulkDownloadByType(true, 'EVENT_PARTICIPANT', 'state')
                  }}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Muat Turun Semua
                </button>
                <button
                  onClick={() => {
                    setShowStatePenyertaanModal(false)
                    handleBulkDownloadByType(false, 'EVENT_PARTICIPANT', 'state')
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Muat Turun Dipilih
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowStatePenyertaanModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State Pencapaian Modal */}
      {showStatePencapaianModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Sijil Negeri - Pencapaian</h3>
              <button
                onClick={() => setShowStatePencapaianModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Dipilih: <span className="font-semibold text-gray-900">{selectedIds.size}</span> peserta
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowStatePencapaianModal(false)
                    handleBulkDownloadByType(true, 'EVENT_WINNER', 'state')
                  }}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Muat Turun Semua
                </button>
                <button
                  onClick={() => {
                    setShowStatePencapaianModal(false)
                    handleBulkDownloadByType(false, 'EVENT_WINNER', 'state')
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Muat Turun Dipilih
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowStatePencapaianModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* National Penyertaan Modal */}
      {showNationalPenyertaanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Sijil Kebangsaan - Penyertaan</h3>
              <button
                onClick={() => setShowNationalPenyertaanModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Dipilih: <span className="font-semibold text-gray-900">{selectedIds.size}</span> peserta
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowNationalPenyertaanModal(false)
                    handleBulkDownloadByType(true, 'EVENT_PARTICIPANT', 'national')
                  }}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Muat Turun Semua
                </button>
                <button
                  onClick={() => {
                    setShowNationalPenyertaanModal(false)
                    handleBulkDownloadByType(false, 'EVENT_PARTICIPANT', 'national')
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Muat Turun Dipilih
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowNationalPenyertaanModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* National Pencapaian Modal */}
      {showNationalPencapaianModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Sijil Kebangsaan - Pencapaian</h3>
              <button
                onClick={() => setShowNationalPencapaianModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Dipilih: <span className="font-semibold text-gray-900">{selectedIds.size}</span> peserta
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowNationalPencapaianModal(false)
                    handleBulkDownloadByType(true, 'EVENT_WINNER', 'national')
                  }}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Muat Turun Semua
                </button>
                <button
                  onClick={() => {
                    setShowNationalPencapaianModal(false)
                    handleBulkDownloadByType(false, 'EVENT_WINNER', 'national')
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Muat Turun Dipilih
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowNationalPencapaianModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Penyertaan Modal */}
      {showQuizPenyertaanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Sijil Kuiz - Penyertaan</h3>
              <button
                onClick={() => setShowQuizPenyertaanModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Dipilih: <span className="font-semibold text-gray-900">{selectedIds.size}</span> peserta
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowQuizPenyertaanModal(false)
                    handleBulkDownloadByType(true, 'QUIZ_PARTICIPANT', 'quiz')
                  }}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Muat Turun Semua
                </button>
                <button
                  onClick={() => {
                    setShowQuizPenyertaanModal(false)
                    handleBulkDownloadByType(false, 'QUIZ_PARTICIPANT', 'quiz')
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Muat Turun Dipilih
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowQuizPenyertaanModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Pencapaian Modal */}
      {showQuizPencapaianModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Sijil Kuiz - Pencapaian</h3>
              <button
                onClick={() => setShowQuizPencapaianModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Dipilih: <span className="font-semibold text-gray-900">{selectedIds.size}</span> peserta
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowQuizPencapaianModal(false)
                    handleBulkDownloadByType(true, 'QUIZ_WINNER', 'quiz')
                  }}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Muat Turun Semua
                </button>
                <button
                  onClick={() => {
                    setShowQuizPencapaianModal(false)
                    handleBulkDownloadByType(false, 'QUIZ_WINNER', 'quiz')
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Muat Turun Dipilih
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowQuizPencapaianModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {bulkProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{bulkProgress.action}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {bulkProgress.current} / {bulkProgress.total}
              </p>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                ></div>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {resultModal.downloaded > 0 ? (
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <FileCheck className="h-6 w-6 text-green-600" />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {resultModal.downloaded > 0 ? 'Muat Turun Selesai' : 'Tiada Sijil Dimuat Turun'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {resultModal.downloaded} sijil berjaya dimuat turun
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResultModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {resultModal.downloaded > 0 && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <span className="font-semibold">{resultModal.downloaded} sijil</span> telah berjaya dimuat turun dan disimpan dalam fail ZIP.
                  </p>
                </div>
              )}

              {resultModal.skipped.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <h4 className="font-semibold text-gray-900">
                      {resultModal.skipped.length} sijil tidak dapat dimuat turun
                    </h4>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    Sijil berikut tidak dapat dimuat turun kerana prasyarat belum lengkap:
                  </p>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {resultModal.skipped.map((item, index) => (
                      <div key={index} className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 mb-1">{item.name}</p>
                            <p className="text-sm text-amber-700">{item.reason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resultModal.downloaded === 0 && resultModal.skipped.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Tiada sijil untuk dimuat turun</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setResultModal(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
