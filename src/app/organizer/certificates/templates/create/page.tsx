import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import { redirect } from 'next/navigation'
import { TemplateEditor } from '../../_components/TemplateEditorFixed'

// Allowed roles for template creation
const ALLOWED_ROLES = ['ADMIN']

export default async function CreateTemplatePage() {
  // Get user session
  const session = await getServerSession(authOptions)
  
  // Check if user is authenticated
  if (!session?.user) {
    // Redirect to login page if not authenticated
    redirect('/auth/organizer/login?callbackUrl=/organizer/certificates/templates/create')
  }
  
  // Check if user has required role (ADMIN only for creation)
  if (!session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    // Redirect to templates list if not authorized
    redirect('/organizer/certificates/templates')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Certificate Template</h1>
        <p className="text-gray-600 mt-2">
          Design a new certificate template by uploading a PDF base and adding custom elements.
        </p>
      </div>
      
      <TemplateEditor session={session} isNew={true} />
    </div>
  )
}
