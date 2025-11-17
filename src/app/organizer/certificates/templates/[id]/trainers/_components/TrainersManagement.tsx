'use client'

import React, { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { Search, Users, Mail, Phone, MapPin, Calendar, Building, FileText, Download, Eye, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import GenerationProgressModal from './GenerationProgressModal'
import CertificatePreviewModal from './CertificatePreviewModal'

interface Trainer {
  attendanceManagerId: number | null
  managerId: number
  eventId: number
  contingentId: number
  attendanceStatus: string
  attendanceCreatedAt: string | null
  managerName: string
  managerEmail: string | null
  managerPhone: string | null
  managerIc: string | null
  contingentName: string
  eventName: string
  eventStartDate: string | null
  eventEndDate: string | null
  institutionName: string | null
  stateName: string | null
  status: string | null
}

interface TrainersManagementProps {
  trainers: Trainer[]
  session: Session
  templateId: number
  templateName: string
}

export default function TrainersManagement({ trainers, session, templateId, templateName }: TrainersManagementProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedTrainers, setSelectedTrainers] = useState<number[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({
    total: 0,
    current: 0,
    generated: 0,
    updated: 0,
    failed: 0,
    errors: [] as Array<{ managerId: number; error: string; trainerName?: string }>,
    isComplete: false
  })
  const [trainerCertificates, setTrainerCertificates] = useState<Record<string, { id: number; uniqueCode: string; serialNumber: string | null }>>({})
  const [isLoadingCertificates, setIsLoadingCertificates] = useState(false)
  const [previewCertificate, setPreviewCertificate] = useState<{
    certificateId: number
    uniqueCode: string
    trainerName: string
    serialNumber: string | null
  } | null>(null)

  // Filter trainers based on search and status
  const filteredTrainers = trainers.filter(trainer => {
    const matchesSearch = 
      trainer.managerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.managerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.contingentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.institutionName?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || 
                         trainer.attendanceStatus === statusFilter ||
                         trainer.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Get unique statuses for filter (both attendance status and custom status)
  const attendanceStatuses = Array.from(new Set(trainers.map(t => t.attendanceStatus)))
  const customStatuses = Array.from(new Set(trainers.map(t => t.status).filter(Boolean))) as string[]
  const uniqueStatuses = [...attendanceStatuses, ...customStatuses]

  // Fetch certificates for trainers
  useEffect(() => {
    fetchTrainerCertificates()
  }, [])

  const fetchTrainerCertificates = async () => {
    setIsLoadingCertificates(true)
    try {
      // Get IC numbers from trainers
      const icNumbers = trainers.map(t => t.managerIc).filter(Boolean)
      
      const response = await fetch(`/api/certificates/templates/${templateId}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ icNumbers })
      })

      if (response.ok) {
        const data = await response.json()
        setTrainerCertificates(data.certificates || {})
      }
    } catch (error) {
      console.error('Error fetching certificates:', error)
    } finally {
      setIsLoadingCertificates(false)
    }
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedTrainers.length === filteredTrainers.length) {
      setSelectedTrainers([])
    } else {
      setSelectedTrainers(filteredTrainers.map(t => t.managerId))
    }
  }

  // Handle individual selection
  const handleSelectTrainer = (managerId: number) => {
    setSelectedTrainers(prev => 
      prev.includes(managerId) 
        ? prev.filter(id => id !== managerId)
        : [...prev, managerId]
    )
  }

  // Handle certificate generation with progress tracking
  const handleGenerateCertificates = async () => {
    if (selectedTrainers.length === 0) return

    setIsGenerating(true)
    setShowProgressModal(true)

    // Initialize progress
    setGenerationProgress({
      total: selectedTrainers.length,
      current: 0,
      generated: 0,
      updated: 0,
      failed: 0,
      errors: [],
      isComplete: false
    })

    let generated = 0
    let updated = 0
    let failed = 0
    const errors: Array<{ managerId: number; error: string; trainerName?: string }> = []

    // Process each trainer one by one
    for (let i = 0; i < selectedTrainers.length; i++) {
      const managerId = selectedTrainers[i]
      const trainer = trainers.find(t => t.managerId === managerId)

      try {
        const response = await fetch(`/api/certificates/templates/${templateId}/trainers/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            managerIds: [managerId]
          })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to generate certificate')
        }

        // Update counts based on result
        generated += result.results.generated
        updated += result.results.updated
        failed += result.results.failed

        // Add any errors from this batch
        if (result.results.errors && result.results.errors.length > 0) {
          errors.push(...result.results.errors.map((e: any) => ({
            ...e,
            trainerName: trainer?.managerName
          })))
        }

      } catch (error) {
        failed++
        errors.push({
          managerId,
          error: error instanceof Error ? error.message : 'Unknown error',
          trainerName: trainer?.managerName
        })
      }

      // Update progress after each trainer
      setGenerationProgress({
        total: selectedTrainers.length,
        current: i + 1,
        generated,
        updated,
        failed,
        errors,
        isComplete: false
      })

      // Small delay to show progress (optional)
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Mark as complete
    setGenerationProgress(prev => ({
      ...prev,
      isComplete: true
    }))

    setIsGenerating(false)

    // Show toast notification
    if (failed === 0) {
      toast.success(`Successfully generated ${generated + updated} certificate${generated + updated !== 1 ? 's' : ''}!`)
    } else {
      toast.warning(`Generated ${generated + updated} certificates with ${failed} error${failed !== 1 ? 's' : ''}.`)
    }

    // Clear selection after successful generation
    setSelectedTrainers([])
    
    // Refresh certificates list
    fetchTrainerCertificates()
  }

  // Handle closing progress modal
  const handleCloseProgressModal = () => {
    setShowProgressModal(false)
    // Reset progress after a delay to allow modal to close smoothly
    setTimeout(() => {
      setGenerationProgress({
        total: 0,
        current: 0,
        generated: 0,
        updated: 0,
        failed: 0,
        errors: [],
        isComplete: false
      })
    }, 300)
  }

  // Handle viewing certificate
  const handleViewCertificate = (certificateId: number, uniqueCode: string, trainerName: string, serialNumber: string | null) => {
    setPreviewCertificate({
      certificateId,
      uniqueCode,
      trainerName,
      serialNumber
    })
  }

  // Handle closing certificate preview
  const handleCloseCertificatePreview = () => {
    setPreviewCertificate(null)
  }

  // Handle downloading certificate
  const handleDownloadCertificate = () => {
    if (previewCertificate) {
      const downloadUrl = `/api/certificates/${previewCertificate.certificateId}/download`
      window.open(downloadUrl, '_blank')
    }
  }

  return (
    <div className="space-y-6">
      {/* Template Info Banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-900">Certificate Template</h3>
            <p className="text-sm text-orange-700 mt-1">
              Managing trainers for: <strong>{templateName}</strong>
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Template ID: {templateId}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Trainers</p>
              <p className="text-2xl font-bold text-gray-900">{trainers.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600">
                {trainers.filter(t => t.attendanceStatus === 'Present').length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unique Events</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(trainers.map(t => t.eventId)).size}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Contingents</p>
              <p className="text-2xl font-bold text-orange-600">
                {new Set(trainers.map(t => t.contingentId)).size}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Building className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Certificates Generated</p>
              <p className="text-2xl font-bold text-teal-600">
                {Object.keys(trainerCertificates).length}
              </p>
            </div>
            <div className="bg-teal-100 p-3 rounded-full">
              <FileText className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, contingent, event, or institution..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count and selection info */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredTrainers.length} of {trainers.length} trainers
            {selectedTrainers.length > 0 && (
              <span className="ml-2 text-orange-600 font-medium">
                ({selectedTrainers.length} selected)
              </span>
            )}
          </div>

          {selectedTrainers.length > 0 && (
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleGenerateCertificates}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : `Generate Certificates (${selectedTrainers.length})`}
              </button>
              <button
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
                onClick={() => setSelectedTrainers([])}
                disabled={isGenerating}
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trainers List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredTrainers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'No trainers found matching your filters' 
                : 'No trainers registered yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTrainers.length === filteredTrainers.length && filteredTrainers.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trainer Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contingent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Certificate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrainers.map((trainer, index) => (
                  <tr 
                    key={`${trainer.managerId}-${trainer.eventId}-${index}`} 
                    className={`hover:bg-gray-50 ${selectedTrainers.includes(trainer.managerId) ? 'bg-orange-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTrainers.includes(trainer.managerId)}
                        onChange={() => handleSelectTrainer(trainer.managerId)}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {trainer.managerName}
                          </div>
                          {trainer.managerIc && (
                            <div className="text-sm text-gray-500">
                              IC: {trainer.managerIc}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {trainer.managerEmail && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-4 w-4 mr-2" />
                            {trainer.managerEmail}
                          </div>
                        )}
                        {trainer.managerPhone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-4 w-4 mr-2" />
                            {trainer.managerPhone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{trainer.contingentName}</div>
                      {trainer.institutionName && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Building className="h-3 w-3 mr-1" />
                          {trainer.institutionName}
                        </div>
                      )}
                      {trainer.stateName && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {trainer.stateName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{trainer.eventName}</div>
                      {trainer.eventStartDate && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(trainer.eventStartDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          trainer.attendanceStatus === 'Present' 
                            ? 'bg-green-100 text-green-800'
                            : trainer.attendanceStatus === 'Absent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {trainer.attendanceStatus}
                        </span>
                        {trainer.status && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {trainer.status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {trainer.managerIc && trainerCertificates[trainer.managerIc] ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleViewCertificate(
                                trainerCertificates[trainer.managerIc!].id,
                                trainerCertificates[trainer.managerIc!].uniqueCode,
                                trainer.managerName,
                                trainerCertificates[trainer.managerIc!].serialNumber
                              )}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="View Certificate"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <a
                              href={`/api/certificates/${trainerCertificates[trainer.managerIc!].id}/download`}
                              download
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                              title="Download Certificate"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not generated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generation Progress Modal */}
      <GenerationProgressModal
        isOpen={showProgressModal}
        progress={generationProgress}
        onClose={handleCloseProgressModal}
      />

      {/* Certificate Preview Modal */}
      {previewCertificate && (
        <CertificatePreviewModal
          isOpen={true}
          certificateUrl={`/api/certificates/${previewCertificate.certificateId}/view`}
          trainerName={previewCertificate.trainerName}
          serialNumber={previewCertificate.serialNumber}
          onClose={handleCloseCertificatePreview}
          onDownload={handleDownloadCertificate}
        />
      )}
    </div>
  )
}
