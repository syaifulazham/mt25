import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import { redirect } from 'next/navigation'
import { TemplateView } from '../../_components/TemplateView'
import { TemplateService } from '@/lib/services/template-service'

// Allowed roles for template viewing
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER']

interface PageProps {
  params: {
    id: string
  }
}

export default async function ViewTemplatePage({ params }: PageProps) {
  // Get user session
  const session = await getServerSession(authOptions)
  
  // Check if user is authenticated
  if (!session?.user) {
    // Redirect to login page if not authenticated
    redirect(`/auth/organizer/login?callbackUrl=/organizer/certificates/templates/${params.id}`)
  }
  
  // Check if user has required role
  if (!session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    // Redirect to dashboard if not authorized
    redirect('/organizer/dashboard')
  }

  // Get template data
  const templateId = parseInt(params.id)
  if (isNaN(templateId)) {
    redirect('/organizer/certificates/templates')
  }

  const template = await TemplateService.getTemplate(templateId)
  if (!template) {
    // Template not found
    redirect('/organizer/certificates/templates')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Certificate Template Details</h1>
        <div className="space-x-2">
          {/* Only show Edit button for ADMIN users */}
          {session.user.role === 'ADMIN' && (
            <a
              href={`/organizer/certificates/templates/${template.id}/edit`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Edit Template
            </a>
          )}
          <a
            href="/organizer/certificates/templates"
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Back to List
          </a>
        </div>
      </div>
      
      <TemplateView template={template} session={session} />
    </div>
  )
}
