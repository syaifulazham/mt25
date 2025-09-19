import { Suspense } from 'react'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import { redirect } from 'next/navigation'
import { TemplateList } from '../_components/TemplateList'
import { TemplateListSkeleton } from '../_components/TemplateListSkeleton'
import { TemplateService } from '@/lib/services/template-service'

// Allowed roles for certificate templates
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

interface PageProps {
  searchParams: {
    page?: string
    search?: string
    status?: 'ACTIVE' | 'INACTIVE'
  }
}

export default async function TemplatesPage({ searchParams }: PageProps) {
  // Get user session
  const session = await getServerSession(authOptions)
  
  // Check if user is authenticated
  if (!session?.user) {
    // Redirect to login page if not authenticated
    redirect('/auth/organizer/login')
  }
  
  // Check if user has required role
  if (!session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    // Redirect to dashboard if not authorized
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                You don't have permission to access this page. Please contact an administrator if you need access.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Certificate Templates</h1>
        {/* Only show create button for ADMIN users */}
        {session.user.role === 'ADMIN' && (
          <a
            href="/organizer/certificates/templates/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Template
          </a>
        )}
      </div>
      
      <Suspense fallback={<TemplateListSkeleton />}>
        <TemplateListWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function TemplateListWrapper({ searchParams }: PageProps) {
  const templates = await TemplateService.getTemplates({
    page: parseInt(searchParams.page || '1'),
    search: searchParams.search,
    status: searchParams.status,
  })

  return <TemplateList initialData={templates} userSession={await getServerSession(authOptions)} />
}
