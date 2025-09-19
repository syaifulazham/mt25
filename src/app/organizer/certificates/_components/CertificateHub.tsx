'use client'

import React, { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { PlusCircle, Search, Download, Upload, Filter, FileText, Printer, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { CertTemplateList } from './CertTemplateList'
import { CertificateList } from './CertificateList'
import { TemplateListSkeleton } from './TemplateListSkeleton'

// Template interfaces
interface Template {
  id: number
  templateName: string
  basePdfPath: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
  creator: {
    id: number
    name: string | null
    email: string
  }
  updater?: {
    id: number
    name: string | null
    email: string
  } | null
}

// Certificate interfaces
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

interface CertificateHubProps {
  session: Session
  initialTemplates: Template[]
  initialCertificates: Certificate[]
  templatesPagination: Pagination
  certificatesPagination: Pagination
}

export function CertificateHub({
  session,
  initialTemplates,
  initialCertificates,
  templatesPagination,
  certificatesPagination
}: CertificateHubProps) {
  // State
  const [activeTab, setActiveTab] = useState('certificates')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Determine user's role-based permissions
  const isAdmin = session.user.role === 'ADMIN'
  const canCreateTemplate = ['ADMIN', 'OPERATOR'].includes(session.user.role as string)
  const canManageCertificates = ['ADMIN', 'OPERATOR'].includes(session.user.role as string)
  
  // Empty states component
  const EmptyState = ({ 
    title,
    description,
    buttonText,
    buttonHref,
    showButton = true
  }: { 
    title: string
    description: string
    buttonText: string
    buttonHref: string
    showButton?: boolean
  }) => {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-gray-100 p-3 mb-4">
          <FileText className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4 max-w-md">
          {description}
        </p>
        {showButton && (
          <Button asChild size="sm">
            <Link href={buttonHref}>
              <PlusCircle className="w-4 h-4 mr-2" />
              {buttonText}
            </Link>
          </Button>
        )}
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search certificates or templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Download className="w-4 h-4" />
            <span>Export List</span>
          </Button>
          
          {canManageCertificates && (
            <>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <Printer className="w-4 h-4" />
                <span>Batch Print</span>
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <Mail className="w-4 h-4" />
                <span>Batch Send</span>
              </Button>
              <Button asChild className="h-9 gap-1">
                <Link href="/organizer/certificates/generate">
                  <PlusCircle className="w-4 h-4" />
                  <span>Generate Certificates</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="certificates" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="certificates" className="space-y-4 mt-4">
          {initialCertificates.length === 0 ? (
            <EmptyState 
              title="No certificates found" 
              description={searchTerm ? `No certificates match '${searchTerm}'` : "No certificates have been generated yet"}
              buttonText="Generate Certificates"
              buttonHref="/organizer/certificates/generate"
              showButton={canManageCertificates}
            />
          ) : (
            <CertificateList
              certificates={initialCertificates}
              pagination={certificatesPagination}
              session={session}
              searchTerm={searchTerm}
            />
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          {initialTemplates.length === 0 ? (
            <EmptyState 
              title="No templates found" 
              description={searchTerm ? `No templates match '${searchTerm}'` : "No certificate templates have been created yet"}
              buttonText="Create Template"
              buttonHref="/organizer/certificates/templates/create"
              showButton={canCreateTemplate}
            />
          ) : (
            <CertTemplateList
              session={session}
              initialTemplates={initialTemplates}
              initialPagination={templatesPagination}
              searchQuery={searchTerm}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
