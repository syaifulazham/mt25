import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import { redirect } from 'next/navigation'
import { TemplateEditor } from '../../../_components/TemplateEditorFixed'
import { TemplateService } from '@/lib/services/template-service'

// Allowed roles for template editing
const ALLOWED_ROLES = ['ADMIN']

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditTemplatePage({ params }: PageProps) {
  // Get user session
  const session = await getServerSession(authOptions)
  
  // Check if user is authenticated
  if (!session?.user) {
    // Redirect to login page if not authenticated
    redirect(`/auth/organizer/login?callbackUrl=/organizer/certificates/templates/${params.id}/edit`)
  }
  
  // Check if user has required role (ADMIN only for editing)
  if (!session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    // Redirect to template view page if not authorized
    redirect(`/organizer/certificates/templates/${params.id}`)
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Certificate Template</h1>
        <p className="text-gray-600 mt-2">
          Update the design and properties of your certificate template.
        </p>
      </div>
      
      <TemplateEditor template={template} session={session} isNew={false} />
    </div>
  )
}
