import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prismaExecute } from '@/lib/prisma'
import TrainersManagement from './_components/TrainersManagement'
import { CertTemplateTargetType } from '@prisma/client'

export const metadata = {
  title: 'Manage Trainers - Malaysia Techlympics',
  description: 'Manage trainers and instructors for certificate generation'
}

async function getTemplate(templateId: number) {
  try {
    const template = await prismaExecute(async (prisma) => {
      return await prisma.certTemplate.findUnique({
        where: { id: templateId },
        select: {
          id: true,
          templateName: true,
          targetType: true,
          status: true
        }
      })
    })
    return template
  } catch (error) {
    console.error('Error fetching template:', error)
    return null
  }
}

async function getTrainers() {
  try {
    console.log('[Trainers Page] Starting to fetch trainers...')
    
    const trainers = await prismaExecute(async (prisma) => {
      console.log('[Trainers Page] Executing SQL query...')
      
      // Get all trainers from attendanceManager with related data
      const result = await prisma.$queryRaw`
        SELECT DISTINCT
          am.id as attendanceManagerId,
          am.managerId,
          am.eventId,
          am.contingentId,
          am.attendanceStatus,
          am.createdAt as attendanceCreatedAt,
          m.name as managerName,
          m.email as managerEmail,
          m.phoneNumber as managerPhone,
          m.ic as managerIc,
          c.name as contingentName,
          e.name as eventName,
          e.startDate as eventStartDate,
          e.endDate as eventEndDate,
          COALESCE(s.name, hi.name, i.name) as institutionName,
          COALESCE(st.name, NULL) as stateName
        FROM attendanceManager am
        INNER JOIN manager m ON am.managerId = m.id
        LEFT JOIN contingent c ON am.contingentId = c.id
        LEFT JOIN event e ON am.eventId = e.id
        LEFT JOIN school s ON c.schoolId = s.id
        LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
        LEFT JOIN independent i ON c.independentId = i.id
        LEFT JOIN state st ON s.stateId = st.id OR hi.stateId = st.id OR i.stateId = st.id
        ORDER BY am.createdAt DESC
      ` as any[]

      console.log('[Trainers Page] Raw result count:', result.length)
      console.log('[Trainers Page] Raw result sample:', JSON.stringify(result[0], null, 2))

      // Convert BigInt values to numbers and Date objects to ISO strings for JSON serialization
      const processedResult = result.map(row => ({
        ...row,
        attendanceManagerId: Number(row.attendanceManagerId),
        managerId: Number(row.managerId),
        eventId: Number(row.eventId),
        contingentId: Number(row.contingentId),
        // Convert Date objects to ISO strings
        attendanceCreatedAt: row.attendanceCreatedAt ? new Date(row.attendanceCreatedAt).toISOString() : null,
        eventStartDate: row.eventStartDate ? new Date(row.eventStartDate).toISOString() : null,
        eventEndDate: row.eventEndDate ? new Date(row.eventEndDate).toISOString() : null
      }))

      console.log('[Trainers Page] Processed result count:', processedResult.length)
      console.log('[Trainers Page] Processed result sample:', JSON.stringify(processedResult[0], null, 2))
      return processedResult
    })

    console.log('[Trainers Page] Returning trainers array with length:', trainers.length)
    return trainers
  } catch (error) {
    console.error('[Trainers Page] ❌ ERROR fetching trainers:', error)
    console.error('[Trainers Page] Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('[Trainers Page] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return []
  }
}

export default async function TrainersPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'OPERATOR'].includes(session.user.role as string)) {
    redirect('/organizer')
  }

  const templateId = parseInt(params.id)
  const template = await getTemplate(templateId)

  if (!template) {
    redirect('/organizer/certificates')
  }

  // Verify template is for trainers
  if (template.targetType?.toString() !== 'TRAINERS') {
    redirect('/organizer/certificates')
  }

  const trainers = await getTrainers()

  console.log('[Trainers Page] Rendering page with', trainers.length, 'trainers')
  console.log('[Trainers Page] Template:', template.templateName, 'ID:', templateId)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <a href="/organizer/certificates" className="hover:text-blue-600">
            Certificates
          </a>
          <span>/</span>
          <span className="text-gray-900">{template.templateName}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Trainers</h1>
        <p className="text-gray-600 mt-2">
          View and manage trainers for certificate template: <strong>{template.templateName}</strong>
        </p>
        {trainers.length === 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ No trainers found in the system. Make sure trainers are registered in the attendance system.
            </p>
          </div>
        )}
      </div>

      <TrainersManagement 
        trainers={trainers} 
        session={session} 
        templateId={templateId}
        templateName={template.templateName}
      />
    </div>
  )
}
