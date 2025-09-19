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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Download, Mail, Printer } from 'lucide-react'
import { format } from 'date-fns'

// Certificate interface
interface Certificate {
  id: number
  templateId: number
  templateName: string
  recipientName: string
  recipientEmail: string | null
  recipientType: 'PARTICIPANT' | 'CONTESTANT' | 'JUDGE' | 'ORGANIZER'
  contestName: string | null
  awardTitle: string | null
  uniqueCode: string
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
  const router = useRouter()
  
  // Role-based permissions
  const isAdmin = session.user.role === 'ADMIN'
  const canManageCertificates = ['ADMIN', 'OPERATOR'].includes(session.user.role as string)
  
  // Fetch certificates when search term or page changes
  useEffect(() => {
    const fetchCertificates = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: pagination.limit.toString(),
          ...(searchTerm && { search: searchTerm }),
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
    
    fetchCertificates()
  }, [searchTerm, currentPage, pagination.limit])
  
  // Filter certificates based on search term (client side filtering for immediate feedback)
  const filteredCertificates = certificates.filter(certificate =>
    certificate.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    certificate.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (certificate.contestName && certificate.contestName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (certificate.awardTitle && certificate.awardTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
    certificate.uniqueCode.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
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
  
  return (
    <div className="space-y-6">
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
              <p className="text-sm text-red-700">{error}</p>
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
                <TableHead>Recipient</TableHead>
                <TableHead>Certificate Type</TableHead>
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

                return (
                  <TableRow key={certificate.id}>
                    <TableCell>
                      <div className="font-medium">{certificate.recipientName}</div>
                      {certificate.recipientEmail && (
                        <div className="text-sm text-gray-500">{certificate.recipientEmail}</div>
                      )}
                      <Badge variant="outline" className="mt-1">{recipientTypeLabel}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>{certificate.templateName}</div>
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
                      <Badge className={statusColor}>{certificate.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {certificate.issuedAt ? format(new Date(certificate.issuedAt), "MMM d, yyyy") : "Not issued yet"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 p-0 bg-transparent border-0 inline-flex items-center justify-center text-gray-500 rounded-md hover:text-gray-700 hover:bg-gray-100">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/organizer/certificates/${certificate.id}`} className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              View Certificate
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center">
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                          {certificate.recipientEmail && certificate.status !== "SENT" && canManageCertificates && (
                            <DropdownMenuItem 
                              className="flex items-center"
                              onClick={() => handleSendCertificate(certificate.id)}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send by Email
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="flex items-center">
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {certificate.status === "DRAFT" && canManageCertificates && (
                            <DropdownMenuItem className="text-blue-600">
                              Generate Certificate
                            </DropdownMenuItem>
                          )}
                          {canManageCertificates && (
                            <DropdownMenuItem className="text-amber-600">
                              Edit Details
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <DropdownMenuItem 
                              className="text-red-600"
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
    </div>
  )
}
