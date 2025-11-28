'use client'

import { useState, useEffect } from 'react'
import { Download, FileCheck, Loader2, X, AlertCircle, ArrowLeft, Search, Plus, CheckCircle, Users, Check, ChevronsUpDown, UserPlus, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'

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
  schoolWinnerCertificate: Certificate | null
}

interface Template {
  id: number
  templateName: string
  status: string
}

interface AllContestant {
  id: number
  name: string
  ic: string
  class: string
  team: string | null
  contingent: string
}

interface Contest {
  id: number
  name: string
  code: string
  contestType: string
  targetgroup: {
    schoolLevel: string
  }[]
}

export default function SchoolWinnersPage() {
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [filteredContestants, setFilteredContestants] = useState<Contestant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [allContestants, setAllContestants] = useState<AllContestant[]>([])
  const [selectedContestants, setSelectedContestants] = useState<AllContestant[]>([])
  const [contestantDropdownOpen, setContestantDropdownOpen] = useState(false)
  const [selectedContestantId, setSelectedContestantId] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  
  // Competition selection states
  const [contests, setContests] = useState<Contest[]>([])
  const [selectedContestId, setSelectedContestId] = useState<string>('')
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [contestantSearch, setContestantSearch] = useState<string>('')
  
  // Wizard steps
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedRank, setSelectedRank] = useState<number | 'other' | null>(null)
  const [customRankNumber, setCustomRankNumber] = useState<string>('')
  
  // View certificate modal
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null)

  useEffect(() => {
    fetchSchoolWinners()
    fetchTemplates()
  }, [])

  useEffect(() => {
    applyFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestants, searchQuery])

  const fetchSchoolWinners = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/participants/contestants/certificates/school-winners')
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

    // Search filter (name, IC, team, contingent)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.ic.toLowerCase().includes(query) ||
        (c.team && c.team.toLowerCase().includes(query)) ||
        c.contingent.toLowerCase().includes(query)
      )
    }

    setFilteredContestants(filtered)
  }

  const handleView = (cert: Certificate) => {
    if (!cert || !cert.filePath) return
    
    setViewingCertificate(cert)
    setShowViewModal(true)
  }

  const handleCloseViewModal = () => {
    setShowViewModal(false)
    setViewingCertificate(null)
  }

  const handleDownload = async (cert: Certificate, contestantName: string) => {
    if (!cert || !cert.filePath) return

    const downloadKey = `${cert.id}-school-winner`
    setDownloadingId(downloadKey)

    try {
      const downloadUrl = `/api/certificates/download/${cert.id}`
      
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Download failed:', errorData)
        alert(errorData.error || 'Failed to download certificate')
        setDownloadingId(null)
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `Certificate-School-Winner-${cert.uniqueCode}.pdf`
      document.body.appendChild(link)
      link.click()
      
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error('Error downloading certificate:', error)
      alert('Failed to download certificate')
    } finally {
      setDownloadingId(null)
    }
  }

  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const response = await fetch('/api/participants/certificates/templates/school-winners')
      if (!response.ok) throw new Error('Failed to fetch templates')
      const data = await response.json()
      setTemplates(data.templates || [])
      if (data.templates && data.templates.length > 0) {
        setSelectedTemplate(data.templates[0].id)
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const fetchAllContestants = async () => {
    try {
      const response = await fetch('/api/participants/contestants/certificates/all-contestants')
      if (!response.ok) throw new Error('Failed to fetch contestants')
      const data = await response.json()
      setAllContestants(data.contestants || [])
    } catch (err) {
      console.error('Error fetching contestants:', err)
    }
  }

  const fetchContests = async () => {
    try {
      const response = await fetch('/api/participants/contests')
      if (!response.ok) throw new Error('Failed to fetch contests')
      const data = await response.json()
      setContests(data || [])
    } catch (err) {
      console.error('Error fetching contests:', err)
    }
  }

  const handleOpenAddModal = () => {
    setShowAddModal(true)
    fetchContests()
  }

  const handleCloseAddModal = () => {
    setShowAddModal(false)
    setSelectedContestants([])
    setSelectedContestId('')
    setLevelFilter('')
    setContestantSearch('')
    setSelectedContestantId(null)
    setContestantDropdownOpen(false)
    setCurrentStep(1)
    setSelectedRank(null)
    setCustomRankNumber('')
    setSelectedTemplate(null)
  }

  const handleAddContestant = () => {
    if (!selectedContestantId) return
    
    const contestant = allContestants.find(c => c.id === selectedContestantId)
    if (!contestant) return
    
    // Check if already added
    if (selectedContestants.some(c => c.id === contestant.id)) {
      alert('Peserta sudah ditambah')
      return
    }
    
    setSelectedContestants([...selectedContestants, contestant])
    setSelectedContestantId(null)
    setContestantDropdownOpen(false)
  }

  const handleRemoveContestant = (id: number) => {
    setSelectedContestants(selectedContestants.filter(c => c.id !== id))
  }

  const getAwardTitle = () => {
    if (selectedRank === 'other') {
      const rankNum = parseInt(customRankNumber)
      if (isNaN(rankNum) || rankNum < 1) {
        return 'TEMPAT KE-...'
      }
      if (rankNum === 1) {
        return 'TEMPAT PERTAMA'
      }
      return `TEMPAT KE-${rankNum}`
    }
    if (selectedRank === 1) {
      return 'TEMPAT PERTAMA'
    }
    return `TEMPAT KE-${selectedRank}`
  }

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return selectedTemplate !== null
      case 2:
        return selectedContestId !== ''
      case 3:
        return selectedRank !== null && (selectedRank !== 'other' || (customRankNumber.trim() !== '' && !isNaN(parseInt(customRankNumber)) && parseInt(customRankNumber) > 0))
      case 4:
        return selectedContestants.length > 0
      default:
        return false
    }
  }

  const handleNextStep = () => {
    if (currentStep === 2) {
      // Load contestants when moving from step 2 to 3
      fetchAllContestants()
    }
    setCurrentStep(currentStep + 1)
  }

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleGenerateCertificates = async () => {
    if (!selectedTemplate || selectedContestants.length === 0) {
      alert('Sila pilih template dan sekurang-kurangnya satu peserta')
      return
    }

    if (!selectedContestId) {
      alert('Sila pilih pertandingan')
      return
    }

    if (!selectedRank) {
      alert('Sila pilih pencapaian')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch(`/api/certificates/templates/${selectedTemplate}/generate-school-winners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contestantIds: selectedContestants.map(c => c.id),
          contestId: parseInt(selectedContestId),
          awardTitle: getAwardTitle()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate certificates')
      }

      const result = await response.json()
      alert(`Berjaya! ${result.generated} sijil telah dijana.`)
      
      // Refresh the winners list
      fetchSchoolWinners()
      handleCloseAddModal()
    } catch (err) {
      console.error('Error generating certificates:', err)
      alert(err instanceof Error ? err.message : 'Gagal menjana sijil')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Memuatkan sijil pemenang...</p>
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
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/participants/contestants/certificates"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Sijil Peserta
        </Link>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <FileCheck className="h-8 w-8 text-yellow-600" />
            <h1 className="text-3xl font-bold text-gray-900">Pemenang (Peringkat Sekolah)</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Template availability indicator */}
            {loadingTemplates ? (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Memeriksa template...
              </div>
            ) : templates.length > 0 ? (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                {templates.length} template aktif
              </div>
            ) : (
              <div className="flex items-center text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-2" />
                Tiada template aktif
              </div>
            )}
            
            <button
              onClick={handleOpenAddModal}
              disabled={templates.length === 0}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                templates.length > 0
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="h-5 w-5" />
              Tambah Pemenang
            </button>
          </div>
        </div>
        <p className="text-gray-600">
          Senarai pemenang peringkat sekolah dan sijil pencapaian mereka
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama, IC, kumpulan, atau kontinjen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-600 font-medium">Jumlah Pemenang</p>
          <p className="text-2xl font-bold text-yellow-900">{contestants.length}</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Sijil Dijana</p>
          <p className="text-2xl font-bold text-green-900">
            {contestants.filter(c => c.schoolWinnerCertificate).length}
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Carian Aktif</p>
          <p className="text-2xl font-bold text-blue-900">{filteredContestants.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peserta
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kelas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kumpulan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontinjen
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sijil Pencapaian
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContestants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {contestants.length === 0 ? 'Tiada pemenang dijumpai' : 'Tiada pemenang yang sepadan dengan carian'}
                  </td>
                </tr>
              ) : (
                filteredContestants.map((contestant, index) => (
                  <tr key={contestant.id} className="hover:bg-gray-50">
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
                      {contestant.team || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {contestant.contingent}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {contestant.schoolWinnerCertificate ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleView(contestant.schoolWinnerCertificate!)}
                            title="Lihat Sijil"
                            className="inline-flex items-center justify-center p-2 text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(contestant.schoolWinnerCertificate!, contestant.name)}
                            disabled={downloadingId === `${contestant.schoolWinnerCertificate.id}-school-winner`}
                            title="Muat Turun Sijil"
                            className="inline-flex items-center justify-center p-2 text-white bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 rounded-md transition-colors"
                          >
                            {downloadingId === `${contestant.schoolWinnerCertificate.id}-school-winner` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Winner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Tambah Pemenang Peringkat Sekolah</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Langkah {currentStep} daripada 5: {
                    currentStep === 1 ? 'Pilih Template Sijil' :
                    currentStep === 2 ? 'Pilih Pertandingan' :
                    currentStep === 3 ? 'Pilih Pencapaian' :
                    currentStep === 4 ? 'Pilih Peserta' :
                    'Semak dan Jana'
                  }
                </p>
              </div>
              <button
                onClick={handleCloseAddModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Step 1: Template Selection */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Pilih Template Sijil
                    </label>
                    {loadingTemplates ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
                      </div>
                    ) : templates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 border rounded-lg">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>Tiada template aktif</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {templates.map(template => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setSelectedTemplate(template.id)}
                            className={`p-4 border-2 rounded-lg text-left transition-all ${
                              selectedTemplate === template.id
                                ? 'border-yellow-500 bg-yellow-50'
                                : 'border-gray-200 hover:border-yellow-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{template.templateName}</h4>
                                <p className="text-sm text-gray-500 mt-1">Status: {template.status}</p>
                              </div>
                              {selectedTemplate === template.id && (
                                <CheckCircle className="h-5 w-5 text-yellow-600" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Competition Selection */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Pilihan Pertandingan
                  </label>
                  
                  {/* Level Filter */}
                  <div className="flex gap-2 mb-3">
                    {[
                      { id: '', label: 'Semua' },
                      { id: 'primary', label: 'Kanak-kanak' },
                      { id: 'secondary', label: 'Remaja' },
                      { id: 'higher', label: 'Belia' }
                    ].map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => {
                          setLevelFilter(level.id)
                          setSelectedContestId('')
                        }}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          levelFilter === level.id
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>

                  {/* Competition Dropdown */}
                  <select
                    value={selectedContestId}
                    onChange={(e) => setSelectedContestId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">-- Pilih Pertandingan --</option>
                    {(() => {
                      const schoolLevelMap: Record<string, string[]> = {
                        'primary': ['Primary'],
                        'secondary': ['Secondary'],
                        'higher': ['Higher Education', 'Higher']
                      }

                      const filteredContests = levelFilter === ''
                        ? contests
                        : contests.filter(contest => {
                            if (!contest.targetgroup || !Array.isArray(contest.targetgroup)) {
                              return false
                            }
                            const allowedLevels = schoolLevelMap[levelFilter] || []
                            return contest.targetgroup.some((tg: any) =>
                              allowedLevels.includes(tg.schoolLevel)
                            )
                          })

                      return filteredContests.map(contest => (
                        <option key={contest.id} value={contest.id}>
                          {contest.code} - {contest.name}
                        </option>
                      ))
                    })()}
                  </select>
                </div>
              )}

              {/* Step 3: Achievement Selection */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Pilih Pencapaian
                  </label>
                  
                  {/* Rank Toggle Buttons */}
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(rank => (
                      <button
                        key={rank}
                        type="button"
                        onClick={() => setSelectedRank(rank)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectedRank === rank
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {rank}
                      </button>
                    ))}
                  </div>
                  
                  {/* Lain-lain Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedRank('other')}
                    className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedRank === 'other'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Lain-lain
                  </button>
                  
                  {/* Custom Rank Number Input */}
                  {selectedRank === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Masukkan Nombor Kedudukan (21 ke atas)
                      </label>
                      <input
                        type="number"
                        min="21"
                        value={customRankNumber}
                        onChange={(e) => setCustomRankNumber(e.target.value)}
                        placeholder="Contoh: 21, 25, 30..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                  )}
                  
                  {/* Preview */}
                  {selectedRank && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Pratonton Tajuk:</p>
                      <p className="text-lg font-semibold text-gray-900">{getAwardTitle()}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Contestant Selection */}
              {currentStep === 4 && (
                <div className="space-y-4">
                {/* Add Contestant Section */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Tambah Peserta</h4>
                  
                  {/* Searchable Contestant Dropdown */}
                  <div className="flex gap-2 relative">
                    <div className="flex-1 relative">
                      <button
                        type="button"
                        onClick={() => setContestantDropdownOpen(!contestantDropdownOpen)}
                        className="w-full px-3 py-2 text-left border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span className="text-sm">
                          {selectedContestantId
                            ? allContestants.find((c) => c.id === selectedContestantId)?.name
                            : "Cari dan pilih peserta..."}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                      </button>
                      
                      {contestantDropdownOpen && (
                        <>
                          {/* Backdrop */}
                          <div 
                            className="fixed inset-0 z-40"
                            onClick={() => setContestantDropdownOpen(false)}
                          />
                          
                          {/* Dropdown */}
                          <div className="absolute top-full left-0 mt-1 w-full md:w-[400px] z-50 rounded-md border bg-white shadow-lg">
                            <div className="flex flex-col">
                              {/* Search Input */}
                              <div className="flex items-center border-b px-3">
                                <Search className="mr-2 h-4 w-4 opacity-50" />
                                <input
                                  type="text"
                                  placeholder="Cari nama atau IC..."
                                  value={contestantSearch}
                                  onChange={(e) => setContestantSearch(e.target.value)}
                                  autoFocus
                                  autoComplete="off"
                                  className="flex h-11 w-full bg-transparent py-3 text-sm outline-none"
                                />
                              </div>
                              
                              {/* Results List */}
                              <div className="max-h-[300px] overflow-y-auto p-1">
                                {allContestants.length === 0 ? (
                                  <div className="py-8 text-center text-sm text-gray-500">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                    Memuatkan...
                                  </div>
                                ) : (
                                  <>
                                    {allContestants
                                      .filter(c => !selectedContestants.some(sc => sc.id === c.id))
                                      .filter(contestant => 
                                        contestant.name.toLowerCase().includes(contestantSearch.toLowerCase()) ||
                                        contestant.ic.toLowerCase().includes(contestantSearch.toLowerCase())
                                      )
                                      .map((contestant) => (
                                        <button
                                          key={contestant.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedContestantId(contestant.id);
                                            setContestantDropdownOpen(false);
                                          }}
                                          className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-yellow-50 transition-colors text-left"
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              selectedContestantId === contestant.id ? "opacity-100" : "opacity-0"
                                            }`}
                                          />
                                          <div className="flex flex-col items-start flex-1">
                                            <span className="font-medium">{contestant.name}</span>
                                            <span className="text-xs text-gray-500">
                                              {contestant.class} • {contestant.ic}
                                            </span>
                                          </div>
                                        </button>
                                      ))}
                                      {allContestants
                                        .filter(c => !selectedContestants.some(sc => sc.id === c.id))
                                        .filter(contestant => 
                                          contestant.name.toLowerCase().includes(contestantSearch.toLowerCase()) ||
                                          contestant.ic.toLowerCase().includes(contestantSearch.toLowerCase())
                                        ).length === 0 && (
                                          <div className="py-6 text-center text-sm text-gray-500">
                                            Tiada peserta dijumpai
                                          </div>
                                        )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddContestant}
                      disabled={!selectedContestantId}
                      className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Info text */}
                  <p className="text-xs text-gray-500">
                    {allContestants.filter(c => !selectedContestants.some(sc => sc.id === c.id)).length} peserta tersedia
                  </p>
                </div>

                {/* Selected Contestants Section */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    Peserta Dipilih ({selectedContestants.length})
                  </h4>
                  {selectedContestants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm border rounded-lg">
                      Belum ada peserta dipilih
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kelas</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kontinjen</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedContestants.map((contestant) => (
                            <tr key={contestant.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {contestant.name}
                                <div className="text-xs text-gray-500">{contestant.ic}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{contestant.class}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{contestant.contingent}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveContestant(contestant.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                </div>
              )}

              {/* Step 5: Review and Generate */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Semak Maklumat</h3>
                  
                  {/* Summary Cards */}
                  <div className="grid gap-4">
                    {/* Template */}
                    <div className="border rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Template Sijil</h4>
                      <p className="text-base font-semibold text-gray-900">
                        {templates.find(t => t.id === selectedTemplate)?.templateName || '-'}
                      </p>
                    </div>

                    {/* Competition */}
                    <div className="border rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Pertandingan</h4>
                      <p className="text-base font-semibold text-gray-900">
                        {contests.find(c => c.id === parseInt(selectedContestId))?.name || '-'}
                      </p>
                    </div>

                    {/* Achievement */}
                    <div className="border rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Pencapaian</h4>
                      <p className="text-base font-semibold text-gray-900">{getAwardTitle()}</p>
                    </div>

                    {/* Contestants */}
                    <div className="border rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">
                        Peserta Dipilih ({selectedContestants.length})
                      </h4>
                      <div className="max-h-40 overflow-y-auto">
                        <ul className="space-y-1">
                          {selectedContestants.map(contestant => (
                            <li key={contestant.id} className="text-sm text-gray-700">
                              • {contestant.name} ({contestant.class})
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={handleCloseAddModal}
                disabled={isGenerating}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Batal
              </button>

              <div className="flex gap-3">
                {currentStep > 1 && (
                  <button
                    onClick={handlePreviousStep}
                    disabled={isGenerating}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Kembali
                  </button>
                )}
                
                {currentStep < 5 ? (
                  <button
                    onClick={handleNextStep}
                    disabled={!canProceedToNextStep()}
                    className="px-4 py-2 text-white bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Seterusnya
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateCertificates}
                    disabled={isGenerating}
                    className="px-4 py-2 text-white bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menjana Sijil...
                      </>
                    ) : (
                      <>
                        <FileCheck className="h-4 w-4" />
                        Jana Sijil ({selectedContestants.length})
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Certificate Modal */}
      {showViewModal && viewingCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Pratonton Sijil</h3>
                <p className="text-sm text-gray-500 mt-1">{viewingCertificate.templateName}</p>
              </div>
              <button
                onClick={handleCloseViewModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body - PDF Viewer */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 180px)' }}>
              <div className="bg-gray-100 rounded-lg p-4">
                <iframe
                  key={viewingCertificate.id}
                  src={`/api/certificates/download/${viewingCertificate.id}?view=true&t=${Date.now()}`}
                  className="w-full h-[70vh] border-0 rounded"
                  title="Certificate Preview"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Kod Unik:</span> {viewingCertificate.uniqueCode}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCloseViewModal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    handleDownload(viewingCertificate, '')
                    handleCloseViewModal()
                  }}
                  disabled={downloadingId === `${viewingCertificate.id}-school-winner`}
                  className="px-4 py-2 text-white bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {downloadingId === `${viewingCertificate.id}-school-winner` ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat turun...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Muat Turun
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
