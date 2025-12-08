'use client'

import { useState, useEffect } from 'react'
import { Download, FileCheck, Loader2, Eye, Search, Users, Award, X, FileText, RefreshCw } from 'lucide-react'

interface Certificate {
  id: number
  recipientName: string
  serialNumber: string | null
  uniqueCode: string
  status: string
  templateName: string
}

interface Trainer {
  managerId: number
  managerName: string
  managerEmail: string | null
  managerIc: string
  contingentName: string
  eventName: string
  institutionName: string | null
  certificate: Certificate | null
}

interface ContingentCertificate {
  id: number
  recipientName: string
  serialNumber: string | null
  uniqueCode: string
  filePath: string
  status: string
  templateName: string
  contingentName: string | null
}

export default function TrainersCertificatesPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [filteredTrainers, setFilteredTrainers] = useState<Trainer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterWithCertificate, setFilterWithCertificate] = useState(false)
  const [previewCertificate, setPreviewCertificate] = useState<{
    certificateId: number
    trainerName: string
    serialNumber: string | null
  } | null>(null)
  const [contingentCertificate, setContingentCertificate] = useState<ContingentCertificate | null>(null)
  const [showContingentModal, setShowContingentModal] = useState(false)
  const [generatingIds, setGeneratingIds] = useState<number[]>([])
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageModal, setMessageModal] = useState<{
    type: 'success' | 'error'
    title: string
    message: string
  } | null>(null)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [regenerateTarget, setRegenerateTarget] = useState<{
    managerId: number
    managerIc: string
    managerName: string
  } | null>(null)

  useEffect(() => {
    fetchTrainers()
    fetchContingentCertificate()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [trainers, searchQuery, filterWithCertificate])

  const fetchTrainers = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/participants/trainers/certificates')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch')
      }
      const data = await response.json()
      setTrainers(data.trainers || [])
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchContingentCertificate = async () => {
    try {
      const response = await fetch('/api/participants/contingent-certificate')
      if (response.ok) {
        const data = await response.json()
        setContingentCertificate(data.certificate)
      }
    } catch (err) {
      console.error('Error fetching contingent certificate:', err)
    }
  }

  const applyFilters = () => {
    let filtered = [...trainers]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => 
        t.managerName.toLowerCase().includes(query) ||
        t.managerIc.toLowerCase().includes(query) ||
        t.contingentName.toLowerCase().includes(query) ||
        t.eventName.toLowerCase().includes(query) ||
        (t.institutionName && t.institutionName.toLowerCase().includes(query))
      )
    }

    // Certificate availability filter
    if (filterWithCertificate) {
      filtered = filtered.filter(t => t.certificate !== null)
    }

    setFilteredTrainers(filtered)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterWithCertificate(false)
  }

  const handleViewCertificate = (certificateId: number, trainerName: string, serialNumber: string | null) => {
    setPreviewCertificate({
      certificateId,
      trainerName,
      serialNumber
    })
  }

  const handleDownload = async (certificateId: number, trainerName: string) => {
    try {
      const response = await fetch(`/api/certificates/${certificateId}/download`)
      if (!response.ok) {
        throw new Error('Failed to download certificate')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `Certificate-Trainer-${trainerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download certificate')
    }
  }

  const handleGenerateCertificate = async (managerId: number, managerIc: string, managerName: string) => {
    setGeneratingIds(prev => [...prev, managerId])
    
    try {
      const response = await fetch('/api/participants/trainers/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          managerId,
          managerIc
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate certificate')
      }

      // Show success message
      setMessageModal({
        type: 'success',
        title: 'Berjaya',
        message: `Sijil berjaya dijana untuk ${managerName}!`
      })
      setShowMessageModal(true)
      
      // Refresh the trainers list
      fetchTrainers()
    } catch (error) {
      console.error('Generation error:', error)
      
      // Show error message
      setMessageModal({
        type: 'error',
        title: 'Ralat',
        message: `Gagal menjana sijil: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      setShowMessageModal(true)
    } finally {
      setGeneratingIds(prev => prev.filter(id => id !== managerId))
    }
  }

  const handleRegenerateCertificate = (managerId: number, managerIc: string, managerName: string) => {
    setRegenerateTarget({ managerId, managerIc, managerName })
    setShowRegenerateConfirm(true)
  }

  const confirmRegenerate = async () => {
    if (!regenerateTarget) return

    const { managerId, managerIc, managerName } = regenerateTarget
    setShowRegenerateConfirm(false)
    setGeneratingIds(prev => [...prev, managerId])
    
    try {
      const response = await fetch('/api/participants/trainers/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          managerId,
          managerIc
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to regenerate certificate')
      }

      // Show success message
      setMessageModal({
        type: 'success',
        title: 'Berjaya',
        message: `Sijil berjaya dijana semula untuk ${managerName} dengan data terkini!`
      })
      setShowMessageModal(true)
      
      // Refresh the trainers list
      fetchTrainers()
    } catch (error) {
      console.error('Regeneration error:', error)
      
      // Show error message
      setMessageModal({
        type: 'error',
        title: 'Ralat',
        message: `Gagal menjana semula sijil: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      setShowMessageModal(true)
    } finally {
      setGeneratingIds(prev => prev.filter(id => id !== managerId))
      setRegenerateTarget(null)
    }
  }

  const cancelRegenerate = () => {
    setShowRegenerateConfirm(false)
    setRegenerateTarget(null)
  }

  const closeMessageModal = () => {
    setShowMessageModal(false)
    setTimeout(() => setMessageModal(null), 300)
  }

  const handleContingentDownload = () => {
    if (!contingentCertificate) return
    
    const link = document.createElement('a')
    link.href = contingentCertificate.filePath
    link.download = `Sijil-Kontinjen-${(contingentCertificate.contingentName || 'Contingent').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    document.body.appendChild(link)
    link.click()
    
    setTimeout(() => {
      document.body.removeChild(link)
    }, 100)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading trainer certificates...</p>
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

  const trainersWithCertificates = trainers.filter(t => t.certificate !== null).length

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Sijil Jurulatih / Pengurus</h1>
        </div>
        <p className="text-gray-600">
          Senarai jurulatih/pengurus dan sijil yang tersedia untuk dimuat turun
        </p>
      </div>

      {/* Contingent Certificate Greeting */}
      {contingentCertificate && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-6 mb-6 shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Award className="h-8 w-8 text-purple-600" />
                <h2 className="text-2xl font-bold text-purple-900">
                  Tahniah! Sijil Kontinjen Tersedia
                </h2>
              </div>
              <div className="space-y-2 text-gray-700">
                <p className="text-lg">
                  Terima kasih atas penyertaan kontinjen <span className="font-bold text-purple-800">{contingentCertificate.contingentName}</span> dalam MT2025!
                </p>
                <p>
                  Penghargaan dan terima kasih diucapkan kepada semua yang terlibat dalam menjayakan penyertaan kontinjen ini. 
                  Semoga pengalaman dan pembelajaran yang diperoleh dapat memberi manfaat dan inspirasi untuk terus maju ke hadapan.
                </p>
                <p className="text-sm text-gray-600 italic">
                  Sijil ini adalah sebagai tanda penghargaan atas komitmen dan dedikasi kontinjen dalam Malaysia Techlympics 2025.
                </p>
              </div>
            </div>
            <div className="ml-6">
              <button
                onClick={() => setShowContingentModal(true)}
                className="flex flex-col items-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl"
              >
                <Award className="h-10 w-10" />
                <span className="font-semibold">Lihat & Muat Turun Sijil</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                placeholder="Cari nama, IC, kontinjen, atau institusi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Certificate Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ketersediaan Sijil
            </label>
            <div className="flex items-center">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterWithCertificate}
                  onChange={(e) => setFilterWithCertificate(e.target.checked)}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="ml-2 text-sm text-gray-700">Hanya yang mempunyai sijil</span>
              </label>
            </div>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchQuery || filterWithCertificate) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={clearFilters}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Padam Semua Penapis
            </button>
            <span className="ml-3 text-sm text-gray-500">
              Menunjukkan {filteredTrainers.length} daripada {trainers.length} jurulatih/pengurus
            </span>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-medium">Jumlah Jurulatih/Pengurus</p>
          <p className="text-2xl font-bold text-orange-900">{trainers.length}</p>
        </div>
        
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="text-sm text-teal-600 font-medium">Sijil Tersedia</p>
          <p className="text-2xl font-bold text-teal-900">{trainersWithCertificates}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontinjen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Institusi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acara
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sijil
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTrainers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500 text-lg font-medium mb-2">
                        {searchQuery || filterWithCertificate
                          ? 'Tiada jurulatih/pengurus dijumpai'
                          : 'Tiada jurulatih/pengurus didaftarkan'}
                      </p>
                      {(searchQuery || filterWithCertificate) && (
                        <button
                          onClick={clearFilters}
                          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                        >
                          Padam penapis
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrainers.map((trainer) => (
                  <tr key={trainer.managerId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {trainer.managerName}
                      </div>
                      {trainer.managerEmail && (
                        <div className="text-sm text-gray-500">
                          {trainer.managerEmail}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {trainer.managerIc}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {trainer.contingentName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {trainer.institutionName || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {trainer.eventName}
                    </td>
                    <td className="px-6 py-4">
                      {trainer.certificate ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <FileCheck className="h-3 w-3" />
                            Tersedia
                          </div>
                          <button
                            onClick={() => handleViewCertificate(
                              trainer.certificate!.id,
                              trainer.managerName,
                              trainer.certificate!.serialNumber
                            )}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Lihat Sijil"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(
                              trainer.certificate!.id,
                              trainer.managerName
                            )}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                            title="Muat Turun Sijil"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRegenerateCertificate(
                              trainer.managerId,
                              trainer.managerIc,
                              trainer.managerName
                            )}
                            disabled={generatingIds.includes(trainer.managerId)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Jana Semula Sijil (untuk pembetulan nama/IC)"
                          >
                            {generatingIds.includes(trainer.managerId) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleGenerateCertificate(
                              trainer.managerId,
                              trainer.managerIc,
                              trainer.managerName
                            )}
                            disabled={generatingIds.includes(trainer.managerId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Jana Sijil"
                          >
                            {generatingIds.includes(trainer.managerId) ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Menjana...
                              </>
                            ) : (
                              <>
                                <FileText className="h-3 w-3" />
                                Jana Sijil
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate Preview Modal */}
      {previewCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Pratonton Sijil
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  {previewCertificate.trainerName}
                  {previewCertificate.serialNumber && (
                    <span className="ml-2 text-xs text-gray-500">
                      Siri: {previewCertificate.serialNumber}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setPreviewCertificate(null)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden bg-gray-100">
              <iframe
                src={`/api/certificates/${previewCertificate.certificateId}/view`}
                className="w-full h-full border-0"
                title={`Sijil untuk ${previewCertificate.trainerName}`}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setPreviewCertificate(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contingent Certificate Modal */}
      {showContingentModal && contingentCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowContingentModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div>
                <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Sijil Kontinjen
                </h3>
                <p className="text-sm text-gray-700 mt-0.5">
                  {contingentCertificate.contingentName}
                  {contingentCertificate.serialNumber && (
                    <span className="ml-2 text-xs text-gray-600">
                      Siri: {contingentCertificate.serialNumber}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setShowContingentModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden bg-gray-100">
              <iframe
                src={contingentCertificate.filePath}
                className="w-full h-full border-0"
                title="Sijil Kontinjen"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                <p className="font-medium text-purple-900">Malaysia Techlympics 2025</p>
                <p>Sijil Penghargaan Kontinjen</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowContingentModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Tutup
                </button>
                <button
                  onClick={handleContingentDownload}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Muat Turun Sijil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Confirmation Modal */}
      {showRegenerateConfirm && regenerateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-900">
                    Jana Semula Sijil
                  </h3>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-700 mb-2">
                Adakah anda pasti untuk menjana semula sijil untuk:
              </p>
              <p className="text-lg font-semibold text-gray-900 mb-4">
                {regenerateTarget.managerName}
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-2">
                <p className="text-sm text-blue-900">
                  <strong>Nota:</strong> Sijil akan dikemas kini dengan data terkini dari pangkalan data (nama, email, kontinjen).
                </p>
              </div>
              <div className="bg-green-50 border-l-4 border-green-500 p-4">
                <p className="text-sm text-green-900">
                  <strong>Nombor Siri dijamin tidak berubah</strong> - Sijil yang sama akan dikemas kini tanpa mencipta pendua.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={cancelRegenerate}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmRegenerate}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Jana Semula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && messageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className={`p-6 ${messageModal.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3">
                {messageModal.type === 'success' ? (
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className={`text-lg font-semibold ${messageModal.type === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                    {messageModal.title}
                  </h3>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-700">{messageModal.message}</p>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeMessageModal}
                className={`px-6 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                  messageModal.type === 'success'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
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
