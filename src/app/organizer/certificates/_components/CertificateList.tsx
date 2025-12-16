'use client'

import React, { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { MoreHorizontal, Eye, Download, Mail, Printer, FileText, Search, X, Filter, CheckSquare, Square, Package } from 'lucide-react'
import { format } from 'date-fns'
import { ViewCertificateModal } from './ViewCertificateModal'
import { EditCertificateModal } from './EditCertificateModal'
import { TemplateFilterModal } from './TemplateFilterModal'

// Certificate interface
interface Certificate {
  id: number
  templateId: number
  templateName: string
  templateTargetType?: string
  recipientName: string
  recipientEmail: string | null
  recipientType: 'PARTICIPANT' | 'CONTESTANT' | 'JUDGE' | 'ORGANIZER'
  contestName: string | null
  awardTitle: string | null
  uniqueCode: string
  serialNumber?: string | null
  filePath: string | null
  status: string
  issuedAt: string | null
  createdAt: string
  updatedAt: string
}

// Pagination interface
interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
}

interface CertificateListProps {
  certificates: Certificate[]
  pagination: Pagination
  session: Session
  searchTerm: string
}

export function CertificateList({ certificates: initialCertificates, pagination: initialPagination, session, searchTerm }: CertificateListProps) {
  const [certificates, setCertificates] = useState<Certificate[]>(initialCertificates)
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPagination.page)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedCertificateId, setSelectedCertificateId] = useState<number | null>(null)
  const [generatingCertificateId, setGeneratingCertificateId] = useState<number | null>(null)
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all')
  const [localSearchTerm, setLocalSearchTerm] = useState('')
  const [templateFilterModalOpen, setTemplateFilterModalOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('All Templates')
  const [selectedCertificates, setSelectedCertificates] = useState<Set<number>>(new Set())
  const [isBulkGenerating, setIsBulkGenerating] = useState(false)
  const [saveToServer, setSaveToServer] = useState(true)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  
  // Role-based permissions
  const isAdmin = session.user.role === 'ADMIN'
  const canManageCertificates = ['ADMIN', 'OPERATOR'].includes(session.user.role as string)
  
  // Handle view certificate
  const handleViewCertificate = (certificateId: number) => {
    setSelectedCertificateId(certificateId)
    setViewModalOpen(true)
  }
  
  // Handle edit certificate
  const handleEditCertificate = (certificateId: number) => {
    setSelectedCertificateId(certificateId)
    setEditModalOpen(true)
  }
  
  // Fetch certificates function
  const fetchCertificates = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(localSearchTerm && { search: localSearchTerm }),
        ...(targetTypeFilter && targetTypeFilter !== 'all' && { targetType: targetTypeFilter }),
        ...(selectedTemplateId && { templateId: selectedTemplateId.toString() }),
      })
      
      const response = await fetch(`/api/certificates?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch certificates')
      }
      
      const data = await response.json()
      setCertificates(data.certificates)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching certificates:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle edit success - refresh the list
  const handleEditSuccess = () => {
    fetchCertificates()
  }
  
  // Handle generate certificate
  const handleGenerateCertificate = async (certificateId: number) => {
    try {
      setGeneratingCertificateId(certificateId)
      
      const response = await fetch(`/api/certificates/${certificateId}/generate`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate certificate')
      }
      
      // Refresh the list to show updated certificate
      await fetchCertificates()
      
    } catch (error) {
      console.error('Error generating certificate:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate certificate')
      setTimeout(() => setError(null), 5000)
    } finally {
      setGeneratingCertificateId(null)
    }
  }
  
  // Fetch certificates when search term, filters or page changes
  useEffect(() => {
    fetchCertificates()
  }, [searchTerm, localSearchTerm, targetTypeFilter, selectedTemplateId, currentPage, pagination.limit])
  
  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [targetTypeFilter, localSearchTerm, selectedTemplateId])
  
  // Filter certificates based on search term and targetType (client side filtering for immediate feedback)
  const filteredCertificates = certificates.filter(certificate => {
    const searchFilter = searchTerm || localSearchTerm
    const matchesSearch = !searchFilter || 
      certificate.recipientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      certificate.templateName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (certificate.contestName && certificate.contestName.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (certificate.awardTitle && certificate.awardTitle.toLowerCase().includes(searchFilter.toLowerCase())) ||
      certificate.uniqueCode.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (certificate.serialNumber && certificate.serialNumber.toLowerCase().includes(searchFilter.toLowerCase()))
    
    const matchesTargetType = targetTypeFilter === 'all' || certificate.templateTargetType === targetTypeFilter
    
    return matchesSearch && matchesTargetType
  })
  
  // Handle template selection
  const handleTemplateSelect = (templateId: number | null, templateName: string) => {
    setSelectedTemplateId(templateId)
    setSelectedTemplateName(templateName)
  }
  
  // Bulk selection handlers
  const toggleCertificateSelection = (certId: number) => {
    setSelectedCertificates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(certId)) {
        newSet.delete(certId)
      } else {
        newSet.add(certId)
      }
      return newSet
    })
  }
  
  const toggleSelectAll = () => {
    if (selectedCertificates.size === filteredCertificates.length) {
      setSelectedCertificates(new Set())
    } else {
      setSelectedCertificates(new Set(filteredCertificates.map(c => c.id)))
    }
  }
  
  const isAllSelected = filteredCertificates.length > 0 && selectedCertificates.size === filteredCertificates.length
  const isSomeSelected = selectedCertificates.size > 0 && selectedCertificates.size < filteredCertificates.length
  
  // Handle bulk PDF generation
  const handleBulkGenerate = async () => {
    if (selectedCertificates.size === 0) return
    
    console.log('Starting bulk PDF generation...')
    console.log('Selected certificates:', Array.from(selectedCertificates))
    console.log('Save to server:', saveToServer)
    
    setIsBulkGenerating(true)
    setShowBulkModal(false)
    setSuccessMessage(null)
    setError(null)
    
    try {
      console.log('Sending request to API...')
      const response = await fetch('/api/certificates/bulk-generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificateIds: Array.from(selectedCertificates),
          saveToServer
        })
      })
      
      console.log('Response received:', response.status, response.statusText)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        console.error('Response not OK:', response.status)
        const errorData = await response.json()
        console.error('Error data:', errorData)
        
        // If all certificates failed, show detailed error
        if (errorData.error === 'All certificates failed to generate') {
          const failureReasons = errorData.details
            .map((d: any) => `${d.recipientName}: ${d.error}`)
            .join('\n')
          throw new Error(`All certificates failed to generate:\n\n${failureReasons}`)
        }
        
        throw new Error(errorData.error || 'Failed to generate certificates')
      }
      
      // Get generation results from headers
      const totalCerts = parseInt(response.headers.get('X-Total-Certificates') || '0')
      const successCount = parseInt(response.headers.get('X-Successful-Count') || '0')
      const failedCount = parseInt(response.headers.get('X-Failed-Count') || '0')
      
      console.log('Generation results:', { totalCerts, successCount, failedCount })
      
      // Download ZIP file
      console.log('Converting response to blob...')
      const blob = await response.blob()
      console.log('Blob size:', blob.size, 'bytes')
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = `certificates-bulk-${Date.now()}.zip`
      a.download = filename
      console.log('Triggering download:', filename)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      console.log('Download triggered successfully')
      
      // Refresh the certificate list
      await fetchCertificates()
      
      // Clear selection
      setSelectedCertificates(new Set())
      
      // Show appropriate message based on results
      setError(null)
      if (failedCount > 0) {
        setSuccessMessage(`✅ ${successCount} certificate${successCount !== 1 ? 's' : ''} generated successfully. ⚠️ ${failedCount} failed (check metadata.json in ZIP for details).`)
      } else {
        setSuccessMessage(`✅ All ${successCount} certificate${successCount !== 1 ? 's' : ''} generated successfully!`)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate certificates')
      console.error('Error generating certificates:', err)
    } finally {
      setIsBulkGenerating(false)
    }
  }
  
  // Clear filters
  const clearFilters = () => {
    setTargetTypeFilter('all')
    setLocalSearchTerm('')
    setSelectedTemplateId(null)
    setSelectedTemplateName('All Templates')
  }
  
  // Check if any filters are active
  const hasActiveFilters = targetTypeFilter !== 'all' || localSearchTerm !== '' || selectedTemplateId !== null
  
  // Handle certificate sending
  const handleSendCertificate = async (certificateId: number) => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/certificates/${certificateId}/send`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to send certificate')
      }
      
      // Update certificate status in the list
      setCertificates(prevCertificates => 
        prevCertificates.map(cert => 
          cert.id === certificateId ? { ...cert, status: 'SENT' } : cert
        )
      )
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send certificate')
      console.error('Error sending certificate:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle certificate deletion
  const handleDeleteCertificate = async (certificateId: number) => {
    if (!confirm('Are you sure you want to delete this certificate?')) {
      return
    }
    
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/certificates/${certificateId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete certificate')
      }
      
      // Remove certificate from the list
      setCertificates(prevCertificates => 
        prevCertificates.filter(cert => cert.id !== certificateId)
      )
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete certificate')
      console.error('Error deleting certificate:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Status badge colors
  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800'
      case 'GENERATED':
        return 'bg-blue-100 text-blue-800'
      case 'SENT':
        return 'bg-green-100 text-green-800'
      case 'DOWNLOADED':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  // Get recipient type label
  const getRecipientTypeLabel = (type: string) => {
    switch(type) {
      case 'PARTICIPANT':
        return 'Participant'
      case 'CONTESTANT':
        return 'Contestant'
      case 'JUDGE':
        return 'Judge'
      case 'ORGANIZER':
        return 'Organizer'
      default:
        return type
    }
  }
  
  // Get certificate type label
  const getCertificateTypeLabel = (type?: string) => {
    switch(type) {
      case 'GENERAL':
        return 'General'
      case 'EVENT_PARTICIPANT':
        return 'Event Participant'
      case 'EVENT_WINNER':
        return 'Event Winner'
      case 'NON_CONTEST_PARTICIPANT':
        return 'Non-Contest Participant'
      default:
        return type || 'General'
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, template, code, serial..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
            {localSearchTerm && (
              <button
                onClick={() => setLocalSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="w-64">
          <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="GENERAL">General</SelectItem>
              <SelectItem value="EVENT_PARTICIPANT">Event Participant</SelectItem>
              <SelectItem value="EVENT_WINNER">Event Winner</SelectItem>
              <SelectItem value="NON_CONTEST_PARTICIPANT">Non-Contest Participant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTemplateFilterModalOpen(true)}
          className={`h-9 gap-1 ${selectedTemplateId ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100' : ''}`}
        >
          <Filter className="h-4 w-4" />
          <span>{selectedTemplateName}</span>
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="h-9"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}
        
        <div className="text-sm text-gray-600">
          {filteredCertificates.length} {filteredCertificates.length === 1 ? 'certificate' : 'certificates'}
        </div>
      </div>
      
      {/* Success message display */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-green-700 whitespace-pre-line">{successMessage}</p>
            </div>
            <div className="ml-3">
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-500 hover:text-green-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
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
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Actions Bar */}
      {selectedCertificates.size > 0 && canManageCertificates && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedCertificates.size} certificate{selectedCertificates.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCertificates(new Set())}
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                Clear Selection
              </Button>
            </div>
            <Button
              onClick={() => setShowBulkModal(true)}
              disabled={isBulkGenerating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isBulkGenerating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Generate & Download PDFs
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      
      {/* Bulk Generation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Bulk PDF Generation</h3>
            <p className="text-gray-600 mb-4">
              Generate PDFs for {selectedCertificates.size} selected certificate{selectedCertificates.size !== 1 ? 's' : ''} and download as a ZIP file.
            </p>
            
            <div className="mb-6">
              <label className="flex items-start space-x-3 cursor-pointer">
                <Checkbox
                  checked={saveToServer}
                  onCheckedChange={(checked) => setSaveToServer(checked as boolean)}
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">Save PDFs to server</div>
                  <div className="text-xs text-gray-500 mt-1">
                    If enabled, generated PDFs will be saved to the server and certificate status will be updated to READY. 
                    If disabled, PDFs will only be included in the download ZIP.
                  </div>
                </div>
              </label>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowBulkModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkGenerate}
                className="bg-green-600 hover:bg-green-700"
              >
                <Package className="h-4 w-4 mr-2" />
                Generate & Download
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {canManageCertificates && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                      className={isSomeSelected && !isAllSelected ? 'opacity-50' : ''}
                    />
                  </TableHead>
                )}
                <TableHead>Recipient</TableHead>
                <TableHead>Certificate Name</TableHead>
                <TableHead>Award / Contest</TableHead>
                <TableHead>Unique Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCertificates.map((certificate) => {
                const statusColor = getStatusBadgeClass(certificate.status)
                const recipientTypeLabel = getRecipientTypeLabel(certificate.recipientType)
                const isGenerating = generatingCertificateId === certificate.id

                return (
                  <TableRow key={certificate.id} className={isGenerating ? 'bg-blue-50 relative' : ''}>
                    {isGenerating && (
                      <td colSpan={canManageCertificates ? 8 : 7} className="absolute inset-0 pointer-events-none">
                        <div className="relative h-full">
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-200">
                            <div className="h-full bg-blue-600 animate-pulse" style={{ width: '100%' }}></div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white px-4 py-2 rounded shadow-lg border border-blue-200 flex items-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                              <span className="text-sm font-medium text-blue-900">Generating PDF...</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    )}
                    {canManageCertificates && (
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedCertificates.has(certificate.id)}
                          onCheckedChange={() => toggleCertificateSelection(certificate.id)}
                          aria-label={`Select certificate for ${certificate.recipientName}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="font-medium">{certificate.recipientName}</div>
                      {certificate.recipientEmail && (
                        <div className="text-sm text-gray-500">{certificate.recipientEmail}</div>
                      )}
                      <Badge variant="outline" className="mt-1">{recipientTypeLabel}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{certificate.templateName}</div>
                      <div className="text-sm text-gray-500">
                        {getCertificateTypeLabel(certificate.templateTargetType)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {certificate.awardTitle && (
                        <div className="font-medium">{certificate.awardTitle}</div>
                      )}
                      {certificate.contestName && (
                        <div className="text-sm text-gray-500">{certificate.contestName}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 p-1 rounded">{certificate.uniqueCode}</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColor}>{certificate.status}</Badge>
                        {certificate.filePath && (
                          <a
                            href={`/api/certificates/serve-pdf?path=${encodeURIComponent(certificate.filePath)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 cursor-pointer"
                            title="View generated PDF"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {certificate.issuedAt ? format(new Date(certificate.issuedAt), "MMM d, yyyy") : "Not issued yet"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            className="flex items-center cursor-pointer"
                            onClick={() => handleViewCertificate(certificate.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Certificate
                          </DropdownMenuItem>
                          {certificate.filePath && (
                            <DropdownMenuItem 
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `/api/certificates/serve-pdf?path=${encodeURIComponent(certificate.filePath!)}`;
                                link.download = `certificate-${certificate.uniqueCode}.pdf`;
                                link.click();
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                          )}
                          {certificate.recipientEmail && certificate.status !== "SENT" && canManageCertificates && (
                            <DropdownMenuItem 
                              className="flex items-center cursor-pointer"
                              onClick={() => handleSendCertificate(certificate.id)}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send by Email
                            </DropdownMenuItem>
                          )}
                          {certificate.filePath && (
                            <DropdownMenuItem 
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                const printWindow = window.open(
                                  `/api/certificates/serve-pdf?path=${encodeURIComponent(certificate.filePath!)}`,
                                  '_blank'
                                );
                                if (printWindow) {
                                  printWindow.onload = () => printWindow.print();
                                }
                              }}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Print
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {canManageCertificates && (
                            <DropdownMenuItem 
                              className="text-blue-600 cursor-pointer"
                              onClick={() => handleGenerateCertificate(certificate.id)}
                              disabled={isGenerating}
                            >
                              {certificate.filePath ? 'Regenerate Certificate' : 'Generate Certificate'}
                            </DropdownMenuItem>
                          )}
                          {canManageCertificates && (
                            <DropdownMenuItem 
                              className="text-amber-600 cursor-pointer"
                              onClick={() => handleEditCertificate(certificate.id)}
                            >
                              Edit Details
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <DropdownMenuItem 
                              className="text-red-600 cursor-pointer"
                              onClick={() => handleDeleteCertificate(certificate.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
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
              const endPage = Math.min(pagination.totalPages, startPage + 4);
              
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
              onClick={() => setCurrentPage(p => Math.min(p + 1, pagination.totalPages))}
              disabled={currentPage === pagination.totalPages}
              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === pagination.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <span className="sr-only">Next</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      )}
      
      {/* View Certificate Modal */}
      {selectedCertificateId && (
        <ViewCertificateModal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false)
            setSelectedCertificateId(null)
          }}
          certificateId={selectedCertificateId}
        />
      )}
      
      {/* Edit Certificate Modal */}
      {selectedCertificateId && (
        <EditCertificateModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedCertificateId(null)
          }}
          certificateId={selectedCertificateId}
          onSuccess={handleEditSuccess}
        />
      )}
      
      {/* Template Filter Modal */}
      <TemplateFilterModal
        isOpen={templateFilterModalOpen}
        onClose={() => setTemplateFilterModalOpen(false)}
        onSelectTemplate={handleTemplateSelect}
        selectedTemplateId={selectedTemplateId}
      />
    </div>
  )
}
