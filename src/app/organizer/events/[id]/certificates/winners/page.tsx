'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy, FileText, Plus, Loader2, CheckCircle, Eye, Download } from 'lucide-react'

interface TeamRanking {
  rank: number
  attendanceTeamId: number
  team: {
    id: number
    name: string
  } | null
  contingent: {
    id: number
    name: string
    logoUrl?: string | null
  } | null
  state: {
    id: number
    name: string
  } | null
  averageScore: number
  sessionCount: number
  contestId: number
  contestName: string
  hasCertificates?: boolean
  isAddedToFinal?: boolean
}

interface Contest {
  id: number
  contestId: number
  name: string
}

export default function WinnersCertificatesPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = parseInt(params.id as string)

  const [contests, setContests] = useState<Contest[]>([])
  const [selectedContest, setSelectedContest] = useState<number | null>(null)
  const [teamRankings, setTeamRankings] = useState<TeamRanking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRankings, setIsLoadingRankings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [splitByState, setSplitByState] = useState(true)
  const [hasWinnerTemplates, setHasWinnerTemplates] = useState<boolean | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResults, setGenerationResults] = useState<any>(null)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [showPreGenerateModal, setShowPreGenerateModal] = useState(false)
  const [preGenRanks, setPreGenRanks] = useState<number[]>([1, 2, 3])
  const [preGeneratedCerts, setPreGeneratedCerts] = useState<any[]>([])
  const [isLoadingPreGen, setIsLoadingPreGen] = useState(false)
  const [preGenScope, setPreGenScope] = useState<'current' | 'all'>('current')
  const [allowRegenerate, setAllowRegenerate] = useState(false)
  const [eventScopeArea, setEventScopeArea] = useState<string | null>(null)
  const [rankingMode, setRankingMode] = useState<'national' | 'state'>('national')
  const [statesCount, setStatesCount] = useState<number>(0)
  const [showDownloadProgress, setShowDownloadProgress] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 })
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [showDownloadComplete, setShowDownloadComplete] = useState(false)
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [showPreGenResults, setShowPreGenResults] = useState(false)
  const [preGenResults, setPreGenResults] = useState({ success: 0, skipped: 0, failed: 0 })
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [viewingCert, setViewingCert] = useState<any>(null)
  const [showManualMapping, setShowManualMapping] = useState(false)
  const [mappingTeam, setMappingTeam] = useState<TeamRanking | null>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [availableCerts, setAvailableCerts] = useState<any[]>([])
  const [certMapping, setCertMapping] = useState<Record<number, number>>({})
  const [showTeamCerts, setShowTeamCerts] = useState(false)
  const [viewingTeam, setViewingTeam] = useState<TeamRanking | null>(null)
  const [teamCertificates, setTeamCertificates] = useState<any[]>([])
  const [isLoadingCerts, setIsLoadingCerts] = useState(false)
  const [winnerTemplateId, setWinnerTemplateId] = useState<number | null>(null)
  const [showDownloadAllByTemplateConfirm, setShowDownloadAllByTemplateConfirm] = useState(false)
  const [totalPreGenCerts, setTotalPreGenCerts] = useState<number>(0)
  const [batchSize, setBatchSize] = useState<number>(50)
  const [downloadStrategy, setDownloadStrategy] = useState<'single-zip' | 'individual'>('individual')
  const [showDownloadOptions, setShowDownloadOptions] = useState(false)

  // Fetch event details to get scopeArea
  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`)
        if (response.ok) {
          const data = await response.json()
          setEventScopeArea(data.scopeArea)
          
          // Set default ranking mode based on scopeArea
          if (data.scopeArea === 'ZONE') {
            setRankingMode('state') // ZONE events always use state-based ranking
          } else if (data.scopeArea === 'NATIONAL') {
            setRankingMode('national') // NATIONAL events always use national ranking
          }
        }
      } catch (err) {
        console.error('Failed to fetch event details:', err)
      }
    }

    fetchEventDetails()
  }, [eventId])

  // Check if winner templates exist for this event
  useEffect(() => {
    const checkWinnerTemplates = async () => {
      try {
        const response = await fetch(`/api/certificates/templates/check-winner?eventId=${eventId}`)
        if (response.ok) {
          const data = await response.json()
          setHasWinnerTemplates(data.hasTemplates)
        }
      } catch (err) {
        console.error('Failed to check winner templates:', err)
      }
    }

    checkWinnerTemplates()
  }, [eventId])

  // Fetch contests for this event
  useEffect(() => {
    const fetchContests = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/judging/contests?eventId=${eventId}`)
        if (!response.ok) throw new Error('Failed to fetch contests')
        
        const data = await response.json()
        setContests(data.contests || [])
        
        // Auto-select first contest
        if (data.contests && data.contests.length > 0) {
          setSelectedContest(data.contests[0].contestId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contests')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContests()
  }, [eventId])

  // Fetch team rankings when contest is selected
  useEffect(() => {
    if (!selectedContest) return

    const fetchRankings = async () => {
      setIsLoadingRankings(true)
      setError(null)
      
      try {
        const response = await fetch(
          `/api/events/${eventId}/judging/team-rankings?contestId=${selectedContest}`
        )
        if (!response.ok) throw new Error('Failed to fetch team rankings')
        
        const data = await response.json()
        setTeamRankings(data.rankings || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rankings')
      } finally {
        setIsLoadingRankings(false)
      }
    }

    fetchRankings()
  }, [eventId, selectedContest])

  // Fetch pre-generated certificates when contest is selected
  useEffect(() => {
    if (!selectedContest) return

    const fetchPreGenerated = async () => {
      try {
        const response = await fetch(
          `/api/events/${eventId}/judging/pre-generated-certs?contestId=${selectedContest}`
        )
        if (response.ok) {
          const data = await response.json()
          const certs = data.certificates || []
          setPreGeneratedCerts(certs)
          
          // Capture templateId from first certificate
          if (certs.length > 0 && certs[0].templateId) {
            setWinnerTemplateId(certs[0].templateId)
          }
        }
      } catch (err) {
        console.error('Failed to fetch pre-generated certificates:', err)
      }
    }

    fetchPreGenerated()
  }, [eventId, selectedContest])

  // Fetch total pre-generated certs count for this template across all contests
  useEffect(() => {
    if (!winnerTemplateId) return

    const fetchTotalCount = async () => {
      try {
        const response = await fetch(
          `/api/events/${eventId}/judging/pre-generated-certs-count?templateId=${winnerTemplateId}`
        )
        if (response.ok) {
          const data = await response.json()
          setTotalPreGenCerts(data.count || 0)
        }
      } catch (err) {
        console.error('Failed to fetch total pre-generated certificates count:', err)
      }
    }

    fetchTotalCount()
  }, [eventId, winnerTemplateId])

  // Fetch states count for state-based ranking calculations
  const fetchStatesCount = async () => {
    // For "all contests" mode, use first contest to get states count (should be same across all contests in event)
    const contestIdToUse = preGenScope === 'all' && contests.length > 0 
      ? contests[0].contestId 
      : selectedContest
    
    if (!contestIdToUse) return 0
    
    try {
      const response = await fetch(`/api/events/${eventId}/judging/states-count?contestId=${contestIdToUse}`)
      if (response.ok) {
        const data = await response.json()
        return data.count || 0
      }
    } catch (err) {
      console.error('Failed to fetch states count:', err)
    }
    return 0
  }

  // Update states count when contest changes, modal opens, or ranking mode changes
  useEffect(() => {
    if (showPreGenerateModal && rankingMode === 'state') {
      fetchStatesCount().then(count => setStatesCount(count))
    }
  }, [showPreGenerateModal, selectedContest, rankingMode, preGenScope, contests])

  const handlePreGenerate = async () => {
    if (preGenScope === 'current' && !selectedContest) {
      alert('Please select a contest first')
      return
    }

    if (preGenRanks.length === 0) {
      alert('Please specify at least one rank')
      return
    }

    setIsLoadingPreGen(true)
    setError(null)

    try {
      if (preGenScope === 'all') {
        // Pre-generate for all contests
        let totalSuccess = 0
        let totalSkipped = 0
        let totalFailed = 0

        for (const contest of contests) {
          const response = await fetch(`/api/events/${eventId}/judging/pre-generate-winner-certs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contestId: contest.contestId,
              ranks: preGenRanks,
              rankingMode: rankingMode,
              allowRegenerate: allowRegenerate
            })
          })

          const data = await response.json()
          if (response.ok) {
            totalSuccess += data.results.success.length
            totalSkipped += data.results.skipped.length
            totalFailed += data.results.failed.length
          }
        }

        // Show results modal
        setPreGenResults({
          success: totalSuccess,
          skipped: totalSkipped,
          failed: totalFailed
        })
        setShowPreGenResults(true)
        
        // Refresh pre-generated certificates list for current contest
        if (selectedContest) {
          const refreshResponse = await fetch(
            `/api/events/${eventId}/judging/pre-generated-certs?contestId=${selectedContest}`
          )
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            setPreGeneratedCerts(refreshData.certificates || [])
          }
        }
      } else {
        // Pre-generate for current contest only
        const response = await fetch(`/api/events/${eventId}/judging/pre-generate-winner-certs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contestId: selectedContest,
            ranks: preGenRanks,
            rankingMode: rankingMode,
            allowRegenerate: allowRegenerate
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to pre-generate certificates')
        }

        // Show results modal
        setPreGenResults({
          success: data.results.success.length,
          skipped: data.results.skipped.length,
          failed: data.results.failed.length
        })
        setShowPreGenResults(true)
        
        // Refresh pre-generated certificates list
        const refreshResponse = await fetch(
          `/api/events/${eventId}/judging/pre-generated-certs?contestId=${selectedContest}`
        )
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setPreGeneratedCerts(refreshData.certificates || [])
        }
      }
      
      setShowPreGenerateModal(false)
      setAllowRegenerate(false) // Reset checkbox after generation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pre-generate certificates')
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to pre-generate certificates'))
    } finally {
      setIsLoadingPreGen(false)
    }
  }

  const handleViewCertificate = (cert: any) => {
    // Open certificate PDF in modal viewer
    if (cert.filePath) {
      setViewingCert(cert)
      setShowPdfViewer(true)
    } else {
      alert('Certificate PDF not available')
    }
  }

  const handleDownloadCertificate = (cert: any) => {
    // Download individual certificate
    if (cert.filePath) {
      const link = document.createElement('a')
      link.href = `/api/certificates/serve-pdf?path=${encodeURIComponent(cert.filePath)}`
      link.download = `${cert.serialNumber.replace(/\//g, '-')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      alert('Certificate PDF not available')
    }
  }

  const handleDownloadAllPreGenerated = () => {
    if (preGeneratedCerts.length === 0) return
    setShowDownloadConfirm(true)
  }

  const confirmDownloadAll = async () => {
    setShowDownloadConfirm(false)
    
    // Calculate expected batches
    const BATCH_SIZE = 50
    const expectedBatches = Math.ceil(preGeneratedCerts.length / BATCH_SIZE)

    // Show progress modal
    setShowDownloadProgress(true)
    setDownloadProgress({ current: 0, total: preGeneratedCerts.length })
    setBatchProgress({ current: 0, total: expectedBatches })

    // Simulate batch progress while waiting for download
    let currentBatch = 0
    const batchInterval = setInterval(() => {
      if (currentBatch < expectedBatches) {
        currentBatch++
        setBatchProgress({ current: currentBatch, total: expectedBatches })
      }
    }, 800) // Update every 800ms to simulate progress

    try {
      // Get certificate IDs
      const certificateIds = preGeneratedCerts
        .filter(cert => cert.filePath)
        .map(cert => cert.id)

      if (certificateIds.length === 0) {
        clearInterval(batchInterval)
        throw new Error('No certificates with valid PDFs found')
      }

      // Call API to generate merged batched ZIP
      const response = await fetch(
        `/api/events/${eventId}/judging/download-all-pregenerated`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            certificateIds,
            contestId: selectedContest
          })
        }
      )

      // Clear the simulation interval
      clearInterval(batchInterval)

      if (!response.ok) {
        let errorMessage = 'Failed to download certificates'
        try {
          // Read as text first, then try to parse as JSON
          const text = await response.text()
          try {
            const errorData = JSON.parse(text)
            errorMessage = errorData.error || errorMessage
          } catch (jsonError) {
            // If not JSON, it might be an HTML error page
            console.error('Server error response:', text.substring(0, 500))
            errorMessage = `Server error (${response.status})`
          }
        } catch (readError) {
          errorMessage = `Server error (${response.status})`
        }
        throw new Error(errorMessage)
      }

      // Get the ZIP file blob
      const blob = await response.blob()
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch 
        ? filenameMatch[1] 
        : `PreGenerated_Certificates_${new Date().toISOString().split('T')[0]}.zip`

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Update progress to complete
      setDownloadProgress({ current: certificateIds.length, total: certificateIds.length })
      setBatchProgress({ current: expectedBatches, total: expectedBatches })
      
      // Hide progress, show completion
      setShowDownloadProgress(false)
      setShowDownloadComplete(true)
    } catch (err) {
      clearInterval(batchInterval)
      setShowDownloadProgress(false)
      setError(err instanceof Error ? err.message : 'Error downloading certificates')
      alert('Error downloading certificates: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleDownloadAllByTemplate = () => {
    if (!winnerTemplateId) {
      alert('Template ID not found')
      return
    }
    setShowDownloadOptions(true)
  }

  const proceedWithDownload = () => {
    setShowDownloadOptions(false)
    if (downloadStrategy === 'individual') {
      downloadIndividualBatches()
    } else {
      setShowDownloadAllByTemplateConfirm(true)
    }
  }

  const downloadIndividualBatches = async () => {
    if (!winnerTemplateId) return

    const expectedBatches = Math.ceil(totalPreGenCerts / batchSize)
    
    setShowDownloadProgress(true)
    setBatchProgress({ current: 0, total: expectedBatches })
    setDownloadProgress({ current: 0, total: totalPreGenCerts })

    try {
      // Download each batch individually
      for (let batchNum = 1; batchNum <= expectedBatches; batchNum++) {
        setBatchProgress({ current: batchNum, total: expectedBatches })
        
        const response = await fetch(
          `/api/events/${eventId}/judging/download-batch-by-template`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateId: winnerTemplateId,
              batchNumber: batchNum,
              batchSize: batchSize
            })
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to download batch ${batchNum}`)
        }

        const blob = await response.blob()
        const contentDisposition = response.headers.get('Content-Disposition')
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
        const filename = filenameMatch?.[1] || `Batch_${batchNum}.pdf`

        // Auto-download the file
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      setBatchProgress({ current: expectedBatches, total: expectedBatches })
      setShowDownloadProgress(false)
      setShowDownloadComplete(true)
    } catch (err) {
      setShowDownloadProgress(false)
      setError(err instanceof Error ? err.message : 'Error downloading batches')
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const confirmDownloadAllByTemplate = async () => {
    setShowDownloadAllByTemplateConfirm(false)
    
    if (!winnerTemplateId) {
      alert('Template ID not found')
      return
    }

    // Calculate expected batches using the selected batch size
    const expectedBatches = Math.ceil(totalPreGenCerts / batchSize)

    // Show progress modal
    setShowDownloadProgress(true)
    setDownloadProgress({ current: 0, total: totalPreGenCerts })
    setBatchProgress({ current: 0, total: expectedBatches })

    // Simulate batch progress while waiting for download
    let currentBatch = 0
    const batchInterval = setInterval(() => {
      if (currentBatch < expectedBatches) {
        currentBatch++
        setBatchProgress({ current: currentBatch, total: expectedBatches })
      }
    }, 800) // Update every 800ms to simulate progress

    try {
      // Call API to generate merged batched ZIP for all contests
      const response = await fetch(
        `/api/events/${eventId}/judging/download-all-pregenerated-by-template`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId: winnerTemplateId,
            batchSize: batchSize
          })
        }
      )

      // Clear the simulation interval
      clearInterval(batchInterval)

      if (!response.ok) {
        let errorMessage = 'Failed to download certificates'
        try {
          // Read as text first, then try to parse as JSON
          const text = await response.text()
          try {
            const errorData = JSON.parse(text)
            errorMessage = errorData.error || errorMessage
          } catch (jsonError) {
            // If not JSON, it might be an HTML error page
            console.error('Server error response:', text.substring(0, 500))
            errorMessage = `Server error (${response.status}). The API endpoint may not be available. Please restart the development server.`
          }
        } catch (readError) {
          errorMessage = `Server error (${response.status})`
        }
        throw new Error(errorMessage)
      }

      // Get the ZIP file blob
      const blob = await response.blob()
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch 
        ? filenameMatch[1] 
        : `All_PreGenerated_Certificates_${new Date().toISOString().split('T')[0]}.zip`

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Update progress to complete
      setDownloadProgress({ current: totalPreGenCerts, total: totalPreGenCerts })
      setBatchProgress({ current: expectedBatches, total: expectedBatches })
      
      // Hide progress, show completion
      setShowDownloadProgress(false)
      setShowDownloadComplete(true)
    } catch (err) {
      clearInterval(batchInterval)
      setShowDownloadProgress(false)
      setError(err instanceof Error ? err.message : 'Error downloading certificates')
      alert('Error downloading certificates: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const openManualMapping = async (team: TeamRanking) => {
    if (!selectedContest) {
      alert('Please select a contest first')
      return
    }

    setMappingTeam(team)
    setIsGenerating(true)

    try {
      // Fetch team members
      const membersResponse = await fetch(
        `/api/events/${eventId}/judging/team-members?teamId=${team.team?.id}`
      )
      const membersData = await membersResponse.json()
      setTeamMembers(membersData.members || [])

      // Fetch available pre-generated certificates for this rank, contest, and state
      let certsUrl = `/api/events/${eventId}/judging/available-certs?contestId=${selectedContest}&rank=${team.rank}`
      
      // Add stateId filter if team has a state (for state-based ranking)
      if (team.state?.id) {
        certsUrl += `&stateId=${team.state.id}`
      }
      
      const certsResponse = await fetch(certsUrl)
      const certsData = await certsResponse.json()
      setAvailableCerts(certsData.certificates || [])

      // Initialize empty mapping
      setCertMapping({})
      setShowManualMapping(true)
    } catch (err) {
      alert('Error loading data: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDirectGenerate = async () => {
    if (!mappingTeam || !selectedContest) return

    const confirmed = confirm(
      `Generate new certificates for all ${teamMembers.length} team members?\n\n` +
      `Team: ${mappingTeam.team?.name}\n` +
      `Rank: ${mappingTeam.rank}\n\n` +
      `New certificates will be created with fresh serial numbers.`
    )

    if (!confirmed) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${eventId}/judging/generate-winner-certs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceTeamId: mappingTeam.attendanceTeamId,
          rank: mappingTeam.rank,
          contestId: selectedContest,
          manualMapping: {} // Empty mapping means generate new for all
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate certificates')
      }

      setGenerationResults(data)
      setShowResultsModal(true)
      setShowManualMapping(false)

      // Refresh team rankings to show certificate status
      const refreshResponse = await fetch(
        `/api/events/${eventId}/judging/team-rankings?contestId=${selectedContest}`
      )
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        setTeamRankings(refreshData.rankings || [])
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate certificates')
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to generate certificates'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleManualGenerate = async () => {
    if (!mappingTeam || !selectedContest) return

    // Validate that all members are mapped
    const unmappedMembers = teamMembers.filter((m, idx) => !certMapping[idx])
    if (unmappedMembers.length > 0) {
      alert(`Please map all team members to certificates (${unmappedMembers.length} unmapped)`)
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${eventId}/judging/generate-winner-certs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceTeamId: mappingTeam.attendanceTeamId,
          rank: mappingTeam.rank,
          contestId: selectedContest,
          manualMapping: certMapping
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate certificates')
      }

      setGenerationResults(data)
      setShowResultsModal(true)
      setShowManualMapping(false)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate certificates')
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to generate certificates'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleViewTeamCerts = async (team: TeamRanking) => {
    setViewingTeam(team)
    setIsLoadingCerts(true)
    setShowTeamCerts(true)

    try {
      // Fetch team certificates
      const response = await fetch(
        `/api/events/${eventId}/judging/team-certificates?teamId=${team.team?.id}&contestId=${selectedContest}&rank=${team.rank}`
      )
      const data = await response.json()
      
      if (response.ok) {
        setTeamCertificates(data.certificates || [])
      } else {
        throw new Error(data.error || 'Failed to fetch certificates')
      }
    } catch (err) {
      console.error('Error fetching team certificates:', err)
      setTeamCertificates([])
      alert('Error loading certificates: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsLoadingCerts(false)
    }
  }

  const handleGenerateCert = async (team: TeamRanking) => {
    if (!selectedContest) {
      alert('Please select a contest first')
      return
    }

    if (team.rank === 0) {
      alert('Cannot generate certificate for unranked team')
      return
    }

    if (!hasWinnerTemplates) {
      alert('No winner certificate templates found. Please create a template first.')
      return
    }

    // Open manual mapping modal instead of direct generation
    openManualMapping(team)
  }

  const handleAddToFinal = async (team: TeamRanking) => {
    if (!team.team?.id) {
      alert('Invalid team data')
      return
    }

    const confirmed = confirm(
      `Add "${team.team.name}" to National Finals?\n\n` +
      `This will register the team for the national-level competition.`
    )

    if (!confirmed) return

    try {
      const response = await fetch(`/api/events/${eventId}/judging/add-to-final`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: team.team.id,
          contestId: selectedContest
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add team to finals')
      }

      // Update the team in the state to mark it as added to finals
      setTeamRankings(prevRankings => 
        prevRankings.map(t => 
          t.team?.id === team.team?.id 
            ? { ...t, isAddedToFinal: true }
            : t
        )
      )

      alert(`✓ Successfully added "${team.team.name}" to National Finals!`)
    } catch (error) {
      console.error('Failed to add team to finals:', error)
      alert(error instanceof Error ? error.message : 'Failed to add team to finals')
    }
  }

  // Group teams by state
  const groupedByState = () => {
    const groups: { [key: string]: TeamRanking[] } = {}
    
    teamRankings.forEach(team => {
      const stateName = team.state?.name || 'No State'
      if (!groups[stateName]) {
        groups[stateName] = []
      }
      groups[stateName].push(team)
    })

    // Re-rank within each state
    Object.keys(groups).forEach(stateName => {
      let stateRank = 1
      groups[stateName] = groups[stateName].map(team => ({
        ...team,
        rank: team.averageScore > 0 ? stateRank++ : 0
      }))
    })

    return groups
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/organizer/events/${eventId}/attendance`}
          className="inline-flex items-center text-blue-600 hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Event Dashboard
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Winners & Certificate Management
        </h1>
        <p className="text-gray-600 mt-2">
          Generate certificates for winners and manage final results
        </p>
      </div>

      {/* Winner Templates Status */}
      {hasWinnerTemplates !== null && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${
          hasWinnerTemplates 
            ? 'bg-green-50 border-green-500' 
            : 'bg-yellow-50 border-yellow-500'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {hasWinnerTemplates ? (
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                hasWinnerTemplates ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {hasWinnerTemplates 
                  ? 'Winner Certificate Templates Available' 
                  : 'No Winner Certificate Templates'
                }
              </h3>
              <p className={`mt-1 text-sm ${
                hasWinnerTemplates ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {hasWinnerTemplates 
                  ? 'Certificate templates for EVENT_WINNER are configured for this event. You can generate certificates for winners.'
                  : 'No certificate templates for EVENT_WINNER found. Please create winner certificate templates before generating certificates.'
                }
              </p>
              {!hasWinnerTemplates && (
                <Link 
                  href="/organizer/certificates" 
                  className="mt-2 inline-flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                >
                  Create Winner Template →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Download All Pre-Generated Certificates (All Contests) */}
      {winnerTemplateId && totalPreGenCerts > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  All Pre-Generated Certificates
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                Total certificates across all contests: <strong className="text-indigo-700">{totalPreGenCerts}</strong>
              </p>
              <p className="text-xs text-gray-500">
                Download all pre-generated blank certificates for template ID {winnerTemplateId}
              </p>
            </div>
            <button
              onClick={handleDownloadAllByTemplate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" />
              Download All ({totalPreGenCerts})
            </button>
          </div>
        </div>
      )}

      {/* Contest Selector */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Select Contest
          </label>
          {selectedContest && hasWinnerTemplates && (
            <button
              onClick={() => setShowPreGenerateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Pre-Generate Blank Certificates
            </button>
          )}
        </div>
        <select
          value={selectedContest || ''}
          onChange={(e) => setSelectedContest(parseInt(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select a contest --</option>
          {contests.map((contest) => (
            <option key={contest.contestId} value={contest.contestId}>
              {contest.name}
            </option>
          ))}
        </select>

        {/* Pre-generated Certificates Status */}
        {selectedContest && preGeneratedCerts.length > 0 && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-purple-900">Pre-Generated Blank Certificates</h4>
              <button
                onClick={handleDownloadAllPreGenerated}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download All ({preGeneratedCerts.length})
              </button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {preGeneratedCerts.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center justify-between p-3 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                        Rank {cert.ownership?.rank}
                      </span>
                      {cert.ownership?.stateName && (
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {cert.ownership.stateName}
                        </span>
                      )}
                      <span className="text-xs text-gray-600">{cert.serialNumber}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{cert.awardTitle}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewCertificate(cert)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 transition-colors"
                      title="View Certificate"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadCertificate(cert)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded hover:bg-green-200 transition-colors"
                      title="Download Certificate"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-purple-700 mt-3">
              {preGeneratedCerts.length} blank certificate(s) ready to be assigned to winners
            </p>
          </div>
        )}
      </div>

      {/* Team Rankings Table */}
      {selectedContest && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Team Rankings</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {teamRankings.length} teams ranked
                </p>
              </div>
              
              {/* Split by State Toggle */}
              <button
                onClick={() => setSplitByState(!splitByState)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  splitByState
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {splitByState ? 'Show All Rankings' : 'Split by State'}
              </button>
            </div>
          </div>

          {isLoadingRankings ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : teamRankings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No team rankings available for this contest
            </div>
          ) : splitByState ? (
            // Split by State View
            <div className="space-y-6 p-6">
              {Object.entries(groupedByState()).map(([stateName, teams]) => (
                <div key={stateName} className="border rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-6 py-3 border-b">
                    <h3 className="text-lg font-semibold text-blue-900">{stateName}</h3>
                    <p className="text-sm text-blue-700">{teams.length} teams</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contingent
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teams.map((team) => (
                          <tr
                            key={team.attendanceTeamId}
                            className={
                              team.rank <= 3 && team.rank > 0
                                ? team.rank === 1
                                  ? 'bg-yellow-50'
                                  : team.rank === 2
                                  ? 'bg-gray-50'
                                  : 'bg-orange-50'
                                : ''
                            }
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {team.rank === 1 && (
                                  <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                                )}
                                {team.rank === 2 && (
                                  <Trophy className="h-5 w-5 text-gray-400 mr-2" />
                                )}
                                {team.rank === 3 && (
                                  <Trophy className="h-5 w-5 text-orange-600 mr-2" />
                                )}
                                <span className="text-lg font-bold">{team.rank || '-'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                {team.rank > 0 ? (
                                  <button
                                    onClick={() => handleViewTeamCerts(team)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                  >
                                    {team.team?.name || 'N/A'}
                                  </button>
                                ) : (
                                  <span>{team.team?.name || 'N/A'}</span>
                                )}
                                {team.hasCertificates && (
                                  <span title="Certificates generated" className="inline-flex">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {team.contingent?.name || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-blue-600">
                                {team.averageScore.toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleGenerateCert(team)}
                                  className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Generate Cert
                                </button>
                                {!team.isAddedToFinal && (
                                  <button
                                    onClick={() => handleAddToFinal(team)}
                                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add to Final
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // All Rankings View
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contingent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      State
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamRankings.map((team) => (
                    <tr
                      key={team.attendanceTeamId}
                      className={
                        team.rank <= 3
                          ? team.rank === 1
                            ? 'bg-yellow-50'
                            : team.rank === 2
                            ? 'bg-gray-50'
                            : 'bg-orange-50'
                          : ''
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {team.rank === 1 && (
                            <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                          )}
                          {team.rank === 2 && (
                            <Trophy className="h-5 w-5 text-gray-400 mr-2" />
                          )}
                          {team.rank === 3 && (
                            <Trophy className="h-5 w-5 text-orange-600 mr-2" />
                          )}
                          <span className="text-lg font-bold">{team.rank}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {team.rank > 0 ? (
                            <button
                              onClick={() => handleViewTeamCerts(team)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              {team.team?.name || 'N/A'}
                            </button>
                          ) : (
                            <span>{team.team?.name || 'N/A'}</span>
                          )}
                          {team.hasCertificates && (
                            <span title="Certificates generated" className="inline-flex">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {team.contingent?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {team.state?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-600">
                          {team.averageScore.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {team.sessionCount} sessions
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGenerateCert(team)}
                            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Generate Cert
                          </button>
                          {!team.isAddedToFinal && (
                            <button
                              onClick={() => handleAddToFinal(team)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add to Final
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Certificate Generation Results Modal */}
      {showResultsModal && generationResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Certificate Generation Results
            </h2>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-semibold">{generationResults.teamName}</p>
              <p className="text-sm text-gray-600">Rank {generationResults.rank}: {generationResults.awardTitle}</p>
            </div>

            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-100 p-3 rounded">
                  <p className="text-sm text-gray-600">Total Members</p>
                  <p className="text-2xl font-bold">{generationResults.results.total}</p>
                </div>
                <div className="bg-green-100 p-3 rounded">
                  <p className="text-sm text-gray-600">Generated</p>
                  <p className="text-2xl font-bold text-green-600">{generationResults.results.success.length}</p>
                </div>
                <div className="bg-red-100 p-3 rounded">
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{generationResults.results.failed.length}</p>
                </div>
              </div>

              {/* Successful Generations */}
              {generationResults.results.success.length > 0 && (
                <div>
                  <h3 className="font-semibold text-green-700 mb-2">✓ Successfully Processed</h3>
                  <div className="bg-green-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <ul className="space-y-2">
                      {generationResults.results.success.map((result: any, index: number) => (
                        <li key={index} className="text-sm flex items-center justify-between">
                          <div>
                            <span className="font-medium">{result.member}</span>
                            <span className="text-gray-600 text-xs ml-2">({result.serialNumber})</span>
                          </div>
                          {result.action && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              result.action === 'created' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {result.action === 'created' ? 'New' : 'Updated'}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Failed Generations */}
              {generationResults.results.failed.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-700 mb-2">✗ Failed</h3>
                  <div className="bg-red-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <ul className="space-y-2">
                      {generationResults.results.failed.map((result: any, index: number) => (
                        <li key={index} className="text-sm">
                          <span className="font-medium">{result.member}</span>
                          <span className="text-red-600 text-xs ml-2">({result.reason})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowResultsModal(false)
                  setGenerationResults(null)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Generate Modal */}
      {showPreGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Pre-Generate Blank Certificates</h3>
              <p className="text-sm text-gray-600 mb-4">
                Generate blank certificates for specific winner ranks. These can be assigned to winners later.
              </p>

              {/* Scope Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generation Scope
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="scope"
                      value="current"
                      checked={preGenScope === 'current'}
                      onChange={() => setPreGenScope('current')}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      Current Contest Only
                      {selectedContest && (
                        <span className="ml-1 text-gray-500">
                          ({contests.find(c => c.contestId === selectedContest)?.name})
                        </span>
                      )}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="scope"
                      value="all"
                      checked={preGenScope === 'all'}
                      onChange={() => setPreGenScope('all')}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      All Contests ({contests.length} contests)
                    </span>
                  </label>
                </div>
              </div>

              {/* Ranking Mode Selection - Only for STATE/DISTRICT scopeArea */}
              {eventScopeArea && eventScopeArea !== 'NATIONAL' && eventScopeArea !== 'ZONE' && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Ranking Mode
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="rankingMode"
                        value="national"
                        checked={rankingMode === 'national'}
                        onChange={() => setRankingMode('national')}
                        className="mr-2"
                      />
                      <span className="text-sm text-blue-800">
                        <strong>National Ranking</strong> - Ranks across all states
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="rankingMode"
                        value="state"
                        checked={rankingMode === 'state'}
                        onChange={() => setRankingMode('state')}
                        className="mr-2"
                      />
                      <span className="text-sm text-blue-800">
                        <strong>State-Based Ranking</strong> - Separate ranks per state
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Info for ZONE and NATIONAL events */}
              {eventScopeArea === 'ZONE' && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-800">
                    <strong>ZONE Event:</strong> State-based ranking will be used (Rank 1 per state)
                  </p>
                </div>
              )}
              {eventScopeArea === 'NATIONAL' && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs text-purple-800">
                    <strong>NATIONAL Event:</strong> National ranking will be used (Rank 1 overall)
                  </p>
                </div>
              )}
              
              {/* Rank Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Ranks to Pre-Generate
                </label>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((rank) => (
                    <label key={rank} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preGenRanks.includes(rank)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPreGenRanks([...preGenRanks, rank].sort((a, b) => a - b))
                          } else {
                            setPreGenRanks(preGenRanks.filter(r => r !== rank))
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">
                        Rank {rank} - {rank === 1 ? 'TEMPAT PERTAMA' : `TEMPAT KE-${rank}`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Regenerate Option */}
              <div className="mb-4">
                <label className="flex items-center p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={allowRegenerate}
                    onChange={(e) => setAllowRegenerate(e.target.checked)}
                    className="mr-3 h-4 w-4"
                  />
                  <div>
                    <span className="text-sm font-medium text-orange-900">
                      Allow Regenerate
                    </span>
                    <p className="text-xs text-orange-700 mt-1">
                      If checked, existing certificates for the same rank will be deleted and regenerated. 
                      Otherwise, duplicates will be skipped.
                    </p>
                  </div>
                </label>
              </div>

              {/* Summary Info */}
              <div className={`border rounded-lg p-3 mb-4 ${
                preGenScope === 'all' ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <p className={`text-xs font-medium mb-1 ${
                  preGenScope === 'all' ? 'text-blue-900' : 'text-yellow-900'
                }`}>
                  {preGenScope === 'all' ? '📋 Bulk Generation' : '📄 Single Contest Generation'}
                </p>
                <p className={`text-xs ${
                  preGenScope === 'all' ? 'text-blue-800' : 'text-yellow-800'
                }`}>
                  {preGenScope === 'all' ? (
                    <>
                      {rankingMode === 'state' ? (
                        <>
                          Will generate <strong>{preGenRanks.length} blank certificate{preGenRanks.length !== 1 ? 's' : ''}</strong> per rank for <strong>each of the {contests.length} contests</strong> × <strong>{statesCount || '?'} states</strong>.
                          <br />
                          Minimum: <strong>{preGenRanks.length * contests.length * (statesCount || 1)} certificates</strong>
                          <br />
                          <span className="text-xs italic">(State-based: Each state gets separate rankings)</span>
                          <br />
                          <span className="text-xs italic text-orange-600">⚠️ Team contests generate multiple certificates per rank (based on team size)</span>
                        </>
                      ) : (
                        <>
                          Will generate <strong>{preGenRanks.length} blank certificate{preGenRanks.length !== 1 ? 's' : ''}</strong> per rank for <strong>each of the {contests.length} contests</strong>.
                          <br />
                          Minimum: <strong>{preGenRanks.length * contests.length} certificates</strong>
                          <br />
                          <span className="text-xs italic">(National: One ranking per contest overall)</span>
                          <br />
                          <span className="text-xs italic text-orange-600">⚠️ Team contests generate multiple certificates per rank (based on team size)</span>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {rankingMode === 'state' && statesCount > 0 ? (
                        <>
                          Will generate <strong>{preGenRanks.length} blank certificate{preGenRanks.length !== 1 ? 's' : ''}</strong> per rank for <strong>{statesCount} state{statesCount !== 1 ? 's' : ''}</strong>.
                          <br />
                          Minimum: <strong>{preGenRanks.length * statesCount} certificates</strong>
                          <br />
                          <span className="text-xs italic">(Each state gets separate ranks)</span>
                          <br />
                          <span className="text-xs italic text-orange-600">⚠️ Team contests generate multiple certificates per rank (based on team size)</span>
                        </>
                      ) : (
                        <>
                          Will generate <strong>{preGenRanks.length} blank certificate{preGenRanks.length !== 1 ? 's' : ''}</strong> per rank.
                          <br />
                          <span className="text-xs italic text-orange-600">⚠️ Team contests generate multiple certificates per rank (based on team size)</span>
                          <br />
                          <span className="text-xs text-gray-600 mt-1">Blank certificates will be generated and can be assigned to actual winners later.</span>
                        </>
                      )}
                    </>
                  )}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPreGenerateModal(false)
                    setPreGenRanks([1, 2, 3])
                    setAllowRegenerate(false)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePreGenerate}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed"
                  disabled={isLoadingPreGen || preGenRanks.length === 0 || (preGenScope === 'current' && !selectedContest)}
                >
                  {isLoadingPreGen ? (
                    <>
                      <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate {preGenScope === 'all' 
                        ? rankingMode === 'state'
                          ? `${preGenRanks.length * contests.length * (statesCount || 1)} Certificate${preGenRanks.length * contests.length * (statesCount || 1) !== 1 ? 's' : ''}`
                          : `${preGenRanks.length * contests.length} Certificate${preGenRanks.length * contests.length !== 1 ? 's' : ''}`
                        : rankingMode === 'state' && statesCount > 0
                          ? `${preGenRanks.length * statesCount} Certificate${preGenRanks.length * statesCount !== 1 ? 's' : ''}`
                          : `${preGenRanks.length} Certificate${preGenRanks.length !== 1 ? 's' : ''}`
                      }
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-lg font-semibold">Generating Certificates...</p>
            <p className="text-sm text-gray-600 mt-2">Please wait while we generate certificates for all team members</p>
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {showDownloadProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 mb-4">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#9333ea"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - downloadProgress.current / downloadProgress.total)}`}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Download className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Merging Certificates
              </h3>
              
              {batchProgress.total > 0 && (
                <div className="mb-3">
                  <p className="text-lg font-semibold text-indigo-600 mb-1">
                    Processing Batch {batchProgress.current} of {batchProgress.total}
                  </p>
                  <p className="text-sm text-gray-600">
                    {downloadProgress.total} total certificates
                  </p>
                </div>
              )}
              
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-300 flex items-center justify-center"
                  style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                >
                  {batchProgress.total > 0 && batchProgress.current > 0 && (
                    <span className="text-xs font-medium text-white">
                      {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-1 text-center">
                <p className="text-sm text-gray-600">
                  Merging PDFs in batches of 50...
                </p>
                <p className="text-xs text-gray-500">
                  This may take a few moments
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Complete Modal */}
      {showDownloadComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Download Complete!
              </h3>
              
              <p className="text-gray-600 text-center mb-2">
                Successfully prepared <strong>{downloadProgress.total}</strong> certificate{downloadProgress.total !== 1 ? 's' : ''}
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-green-800 text-center">
                  📦 Your ZIP file contains <strong>{Math.ceil(downloadProgress.total / 50)} merged PDF file{Math.ceil(downloadProgress.total / 50) !== 1 ? 's' : ''}</strong>
                  <br />
                  <span className="text-xs text-green-700">(50 certificates per PDF)</span>
                </p>
              </div>
              
              <button
                onClick={() => setShowDownloadComplete(false)}
                className="px-6 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Confirmation Modal */}
      {showDownloadConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex flex-col">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Download className="h-6 w-6 text-purple-600" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                Download All Certificates?
              </h3>
              
              <p className="text-gray-600 text-center mb-4">
                You are about to download <strong>{preGeneratedCerts.length}</strong> certificate{preGeneratedCerts.length !== 1 ? 's' : ''}.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      Certificates will be merged in <strong>batches of 50 PDFs</strong> per file and compressed into a <strong>ZIP folder</strong> for easy download.
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Expected: {Math.ceil(preGeneratedCerts.length / 50)} merged PDF file{Math.ceil(preGeneratedCerts.length / 50) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDownloadConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDownloadAll}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Options Modal */}
      {showDownloadOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
            <div className="flex flex-col">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Download Options</h3>
              
              {/* Batch Size Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certificates per Merged PDF
                </label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={10}>10 certificates per PDF</option>
                  <option value={25}>25 certificates per PDF</option>
                  <option value={50}>50 certificates per PDF</option>
                  <option value={100}>100 certificates per PDF</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Total batches: {Math.ceil(totalPreGenCerts / batchSize)} PDFs
                </p>
              </div>

              {/* Download Strategy */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Download Strategy
                </label>
                
                <div className="space-y-3">
                  {/* Individual Downloads */}
                  <div
                    onClick={() => setDownloadStrategy('individual')}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      downloadStrategy === 'individual'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        checked={downloadStrategy === 'individual'}
                        onChange={() => setDownloadStrategy('individual')}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Download Each Batch Separately</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Downloads {Math.ceil(totalPreGenCerts / batchSize)} separate PDF files sequentially.
                          <span className="block text-green-600 font-medium mt-1">
                            ✓ Recommended - No timeout issues
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Single ZIP */}
                  <div
                    onClick={() => setDownloadStrategy('single-zip')}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      downloadStrategy === 'single-zip'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        checked={downloadStrategy === 'single-zip'}
                        onChange={() => setDownloadStrategy('single-zip')}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Compress All Into Single ZIP</p>
                        <p className="text-sm text-gray-600 mt-1">
                          All batches compressed into one ZIP file.
                          <span className="block text-amber-600 font-medium mt-1">
                            ⚠ May timeout for large numbers of certificates
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDownloadOptions(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={proceedWithDownload}
                  className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Proceed with Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download All By Template Confirmation Modal */}
      {showDownloadAllByTemplateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
            <div className="flex flex-col">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Download className="h-6 w-6 text-indigo-600" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                Download All Pre-Generated Certificates?
              </h3>
              
              <p className="text-gray-600 text-center mb-4">
                You are about to download <strong>{totalPreGenCerts}</strong> certificate{totalPreGenCerts !== 1 ? 's' : ''} from <strong>all contests</strong>.
              </p>
              
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-indigo-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-indigo-900 font-medium mb-1">
                      Scope: All Contests
                    </p>
                    <p className="text-sm text-indigo-800">
                      Certificates will be merged in <strong>batches of 50 PDFs</strong> per file and compressed into a <strong>ZIP folder</strong>.
                    </p>
                    <p className="text-xs text-indigo-700 mt-2">
                      Expected: {Math.ceil(totalPreGenCerts / 50)} merged PDF file{Math.ceil(totalPreGenCerts / 50) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-amber-800">
                  💡 This will download certificates across <strong>all contests</strong> for template ID {winnerTemplateId}
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDownloadAllByTemplateConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDownloadAllByTemplate}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Download All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Generation Results Modal */}
      {showPreGenResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-10 w-10 text-purple-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Pre-Generation Complete!
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                Certificate pre-generation has finished
              </p>

              {/* Results Summary */}
              <div className="w-full space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-900">Generated</span>
                  <span className="text-lg font-bold text-green-600">{preGenResults.success}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm font-medium text-yellow-900">Skipped</span>
                  <span className="text-lg font-bold text-yellow-600">{preGenResults.skipped}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-900">Failed</span>
                  <span className="text-lg font-bold text-red-600">{preGenResults.failed}</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowPreGenResults(false)}
                className="px-6 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfViewer && viewingCert && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Certificate Preview
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                    Rank {viewingCert.ownership?.rank}
                  </span>
                  {viewingCert.ownership?.stateName && (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      {viewingCert.ownership.stateName}
                    </span>
                  )}
                  <span className="text-xs text-gray-600">{viewingCert.serialNumber}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadCertificate(viewingCert)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                  title="Download Certificate"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={() => {
                    setShowPdfViewer(false)
                    setViewingCert(null)
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden bg-gray-100">
              <iframe
                src={`/api/certificates/serve-pdf?path=${encodeURIComponent(viewingCert.filePath)}`}
                className="w-full h-full border-0"
                title="Certificate Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Manual Certificate Mapping Modal */}
      {showManualMapping && mappingTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Certificate Assignment - {mappingTeam.team?.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Rank {mappingTeam.rank} - {mappingTeam.rank === 1 ? 'TEMPAT PERTAMA' : `TEMPAT KE-${mappingTeam.rank}`}
                {mappingTeam.state && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {mappingTeam.state.name}
                  </span>
                )}
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {isGenerating ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600">Loading team data...</span>
                </div>
              ) : (
                <>
                  {/* Instructions */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Choose Assignment Method:</strong><br/>
                      • <strong>Auto-Map:</strong> Automatically assigns certificates in order (Member 1 → Cert 1, Member 2 → Cert 2, etc.)<br/>
                      • <strong>Manual Map:</strong> Select specific certificates for each team member from the dropdowns below
                    </p>
                  </div>

                  {/* Available Certificates Summary */}
                  {availableCerts.length > 0 && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-900">
                        ✓ <strong>{availableCerts.length} pre-generated certificate{availableCerts.length !== 1 ? 's' : ''}</strong> available
                      </p>
                      <p className="text-xs text-green-800 mt-1">
                        Filtered for: Rank {mappingTeam.rank}, Contest "{contests.find(c => c.contestId === selectedContest)?.name || 'Selected Contest'}"
                        {mappingTeam.state && `, ${mappingTeam.state.name}`}
                      </p>
                    </div>
                  )}

                  {availableCerts.length === 0 && (
                    <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-amber-900">
                            No Pre-Generated Certificates Available
                          </p>
                          <p className="text-xs text-amber-800 mt-1">
                            No pre-generated certificates found for Rank {mappingTeam.rank}, Contest "{contests.find(c => c.contestId === selectedContest)?.name || 'Selected Contest'}"
                            {mappingTeam.state && `, ${mappingTeam.state.name}`}.
                          </p>
                          <p className="text-xs text-amber-700 mt-2 font-medium">
                            💡 You can generate new certificates directly without pre-generation. Click "Direct Generate" below.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team Members Mapping Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team Member
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            IC Number
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Assign Certificate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teamMembers.map((member, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {member.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {member.ic || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {availableCerts.length > 0 ? (
                                <select
                                  value={certMapping[idx] || ''}
                                  onChange={(e) => setCertMapping({
                                    ...certMapping,
                                    [idx]: parseInt(e.target.value)
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                >
                                  <option value="">-- Select Certificate --</option>
                                  {availableCerts.map((cert) => {
                                    // Check if this certificate is already selected by another member
                                    const isSelectedByOther = Object.entries(certMapping).some(
                                      ([memberIdx, certId]) => 
                                        parseInt(memberIdx) !== idx && certId === cert.id
                                    )
                                    
                                    return (
                                      <option 
                                        key={cert.id} 
                                        value={cert.id}
                                        disabled={isSelectedByOther}
                                      >
                                        {cert.serialNumber} (Member #{cert.ownership?.memberNumber || '?'}
                                        {cert.ownership?.stateName ? ` - ${cert.ownership.stateName}` : ''})
                                        {isSelectedByOther ? ' - Already Assigned' : ''}
                                      </option>
                                    )
                                  })}
                                </select>
                              ) : (
                                <span className="text-gray-500 italic">New cert will be created</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <button
                onClick={() => {
                  setShowManualMapping(false)
                  setCertMapping({})
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isGenerating}
              >
                Cancel
              </button>

              <div className="flex gap-3">
                {availableCerts.length > 0 ? (
                  // Show mapping buttons when pre-generated certs are available
                  <>
                    <button
                      onClick={async () => {
                        // Auto-map: Map each member to certificate in order
                        const autoMapping: Record<number, number> = {}
                        teamMembers.forEach((member, idx) => {
                          if (availableCerts[idx]) {
                            autoMapping[idx] = availableCerts[idx].id
                          }
                        })
                        setCertMapping(autoMapping)
                        
                        // Automatically trigger generation with auto-mapping
                        const confirmed = confirm(
                          `Auto-assign certificates in order?\n\n` +
                          teamMembers.map((m, i) => 
                            `${m.name} → ${availableCerts[i]?.serialNumber || 'New cert'}`
                          ).join('\n')
                        )
                        
                        if (confirmed) {
                          setCertMapping(autoMapping)
                          setTimeout(() => handleManualGenerate(), 100)
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                      disabled={isGenerating}
                    >
                      Auto-Map & Generate
                    </button>
                    
                    <button
                      onClick={handleManualGenerate}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed"
                      disabled={isGenerating || teamMembers.filter((m, idx) => !certMapping[idx]).length > 0}
                    >
                      {isGenerating ? 'Generating...' : 'Generate with Selected Mapping'}
                    </button>
                  </>
                ) : (
                  // Show direct generate button when no pre-generated certs
                  <button
                    onClick={handleDirectGenerate}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-md hover:from-green-700 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        Direct Generate ({teamMembers.length} Certificates)
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Certificates View Modal */}
      {showTeamCerts && viewingTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Team Certificates - {viewingTeam.team?.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Rank {viewingTeam.rank} - {viewingTeam.rank === 1 ? 'TEMPAT PERTAMA' : `TEMPAT KE-${viewingTeam.rank}`}
                {viewingTeam.state && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {viewingTeam.state.name}
                  </span>
                )}
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingCerts ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600">Loading certificates...</span>
                </div>
              ) : teamCertificates.length > 0 ? (
                <div className="space-y-4">
                  {teamCertificates.map((cert, idx) => (
                    <div key={cert.id || idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-700 font-bold rounded-full">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="text-base font-semibold text-gray-900">{cert.memberName}</h4>
                              <p className="text-sm text-gray-600">IC: {cert.ic || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <div className="mt-3 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Serial Number</p>
                              <p className="text-sm font-mono font-medium text-gray-900">
                                {cert.serialNumber || (
                                  <span className="text-gray-400 italic">Not assigned</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Certificate Status</p>
                              <p className="text-sm">
                                {cert.certificateId ? (
                                  cert.filePath ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      ✓ Generated
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      Pre-generated (Blank)
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Not Created
                                  </span>
                                )}
                              </p>
                            </div>
                            {cert.certificateType && (
                              <div>
                                <p className="text-xs text-gray-500">Type</p>
                                <p className="text-sm font-medium text-gray-900">{cert.certificateType}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {cert.certificateId && cert.filePath && (
                          <div className="ml-4 flex flex-col gap-2">
                            <button
                              onClick={() => {
                                setViewingCert(cert)
                                setShowPdfViewer(true)
                              }}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </button>
                            <a
                              href={`/api/certificates/serve-pdf?path=${encodeURIComponent(cert.filePath)}`}
                              download
                              className="inline-flex items-center justify-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No certificates found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Certificates have not been generated for this team yet.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end bg-gray-50">
              <button
                onClick={() => {
                  setShowTeamCerts(false)
                  setViewingTeam(null)
                  setTeamCertificates([])
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
