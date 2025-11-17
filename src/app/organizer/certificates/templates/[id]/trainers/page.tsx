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
      // Optimized query with proper joins
      const mainResult = await prisma.$queryRaw`
        SELECT 
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
          CASE 
            WHEN s.stateId IS NOT NULL THEN (SELECT name FROM state WHERE id = s.stateId)
            WHEN hi.stateId IS NOT NULL THEN (SELECT name FROM state WHERE id = hi.stateId)
            WHEN i.stateId IS NOT NULL THEN (SELECT name FROM state WHERE id = i.stateId)
            ELSE NULL
          END as stateName,
          NULL as status
        FROM attendanceManager am
        INNER JOIN manager m ON am.managerId = m.id
        LEFT JOIN contingent c ON am.contingentId = c.id
        LEFT JOIN event e ON am.eventId = e.id
        LEFT JOIN school s ON c.schoolId = s.id
        LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
        LEFT JOIN independent i ON c.independentId = i.id
        ORDER BY am.createdAt DESC
      ` as any[]

      console.log('[Trainers Page] Main result count:', mainResult.length)

      // Get additional trainers from attendanceTeam -> manager_team -> manager
      // Only include those NOT already in attendanceManager
      // Use ROW_NUMBER to pick only one record per IC
      const lateAdditions = await prisma.$queryRaw`
        SELECT * FROM (
          SELECT 
            NULL as attendanceManagerId,
            m.id as managerId,
            at.eventId,
            t.contingentId,
            at.attendanceStatus,
            at.createdAt as attendanceCreatedAt,
            m.name as managerName,
            m.email as managerEmail,
            m.phoneNumber as managerPhone,
            m.ic as managerIc,
            c.name as contingentName,
            e.name as eventName,
            e.startDate as eventStartDate,
            e.endDate as eventEndDate,
            COALESCE(s.name, hi.name, i.name) as institutionName,
            CASE 
              WHEN s.stateId IS NOT NULL THEN (SELECT name FROM state WHERE id = s.stateId)
              WHEN hi.stateId IS NOT NULL THEN (SELECT name FROM state WHERE id = hi.stateId)
              WHEN i.stateId IS NOT NULL THEN (SELECT name FROM state WHERE id = i.stateId)
              ELSE NULL
            END as stateName,
            'Late Addition' as status,
            ROW_NUMBER() OVER (PARTITION BY m.ic ORDER BY at.createdAt DESC) as rn
          FROM attendanceTeam at
          INNER JOIN team t ON at.teamId = t.id
          INNER JOIN manager_team mt ON t.id = mt.teamId
          INNER JOIN manager m ON mt.managerId = m.id
          LEFT JOIN contingent c ON t.contingentId = c.id
          LEFT JOIN event e ON at.eventId = e.id
          LEFT JOIN school s ON c.schoolId = s.id
          LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
          LEFT JOIN independent i ON c.independentId = i.id
          WHERE NOT EXISTS (
            SELECT 1 FROM attendanceManager am2
            WHERE am2.managerId = m.id
          )
        ) ranked
        WHERE rn = 1
        ORDER BY attendanceCreatedAt DESC
      ` as any[]

      console.log('[Trainers Page] Late additions count:', lateAdditions.length)

      // Get ICs from main list to exclude from late additions
      const mainListICs = new Set(mainResult.map(r => r.managerIc).filter(Boolean))
      
      // Filter late additions to exclude any IC already in main list
      const filteredLateAdditions = lateAdditions.filter(la => !mainListICs.has(la.managerIc))
      
      console.log('[Trainers Page] Late additions after IC deduplication:', filteredLateAdditions.length)

      // Combine both results
      const combinedResult = [...mainResult, ...filteredLateAdditions]
      console.log('[Trainers Page] Combined result count:', combinedResult.length)

      // Convert BigInt values to numbers and Date objects to ISO strings for JSON serialization
      const processedResult = combinedResult.map(row => ({
        ...row,
        attendanceManagerId: row.attendanceManagerId ? Number(row.attendanceManagerId) : null,
        managerId: Number(row.managerId),
        eventId: Number(row.eventId),
        contingentId: Number(row.contingentId),
        // Convert Date objects to ISO strings
        attendanceCreatedAt: row.attendanceCreatedAt ? new Date(row.attendanceCreatedAt).toISOString() : null,
        eventStartDate: row.eventStartDate ? new Date(row.eventStartDate).toISOString() : null,
        eventEndDate: row.eventEndDate ? new Date(row.eventEndDate).toISOString() : null,
        status: row.status || null
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
