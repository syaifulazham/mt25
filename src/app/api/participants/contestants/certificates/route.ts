import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the participant
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email }
    })
    
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Get all contingents managed by this participant
    const managedContingents = await prisma.contingentManager.findMany({
      where: {
        participantId: participant.id
      },
      select: {
        contingentId: true
      }
    })
    
    // Also check legacy relationship
    const legacyContingents = await prisma.contingent.findMany({
      where: {
        managedByParticipant: true,
        participantId: participant.id
      },
      select: {
        id: true
      }
    })
    
    // Combine both types of managed contingents
    const contingentIds = [
      ...managedContingents.map(c => c.contingentId),
      ...legacyContingents.map(c => c.id)
    ]
    
    if (contingentIds.length === 0) {
      return NextResponse.json({ contestants: [] })
    }

    // Get all contestants from these contingents with their certificates
    const contestants = await prisma.contestant.findMany({
      where: {
        contingentId: { in: contingentIds }
      },
      select: {
        id: true,
        name: true,
        ic: true,
        class_grade: true,
        class_name: true,
        age: true,
        contingent: {
          select: {
            id: true,
            name: true
          }
        },
        teamMembers: {
          select: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    })

    // Fetch certificates for all contestants
    const contestantsWithCerts = await Promise.all(
      contestants.map(async (contestant) => {
        // Get school certificates (GENERAL) - match by IC number
        const schoolCertificates = await prisma.certificate.findMany({
          where: {
            ic_number: contestant.ic,
            status: 'READY',
            template: {
              targetType: 'GENERAL'
            }
          },
          include: {
            template: {
              select: {
                id: true,
                templateName: true,
                targetType: true
              }
            }
          }
        })

        // Get state/national certificates - match by ownership.contingentId
        const zoneNationalCertificates = await prisma.$queryRaw<Array<{
          id: number
          templateId: number
          recipientName: string
          filePath: string | null
          uniqueCode: string
          ownership: any
          templateName: string
          targetType: string
          eventId: number | null
          scopeArea: string | null
        }>>`
          SELECT 
            c.id,
            c.templateId,
            c.recipientName,
            c.filePath,
            c.uniqueCode,
            c.ownership,
            ct.templateName,
            ct.targetType,
            ct.eventId,
            e.scopeArea
          FROM certificate c
          INNER JOIN cert_template ct ON c.templateId = ct.id
          LEFT JOIN event e ON ct.eventId = e.id
          WHERE c.status = 'READY'
            AND JSON_EXTRACT(c.ownership, '$.contingentId') = ${contestant.contingent?.id}
            AND c.ic_number = ${contestant.ic}
            AND e.scopeArea IN ('ZONE', 'ONLINE_STATE', 'NATIONAL')
        `

        // Get quiz certificates - match by IC and targetType
        const quizCertificates = await prisma.$queryRaw<Array<{
          id: number
          templateId: number
          recipientName: string
          filePath: string | null
          uniqueCode: string
          ownership: any
          templateName: string
          targetType: string
          quizId: number | null
        }>>`
          SELECT 
            c.id,
            c.templateId,
            c.recipientName,
            c.filePath,
            c.uniqueCode,
            c.ownership,
            ct.templateName,
            ct.targetType,
            ct.quizId
          FROM certificate c
          INNER JOIN cert_template ct ON c.templateId = ct.id
          WHERE c.status = 'READY'
            AND c.ic_number = ${contestant.ic}
            AND ct.targetType IN ('QUIZ_PARTICIPANT', 'QUIZ_WINNER')
        `

        // Debug logging
        if (contestant.contingent?.id === 202) {
          console.log(`\n[DEBUG] Contestant: ${contestant.name} (IC: ${contestant.ic})`)
          console.log(`  Contingent ID: ${contestant.contingent?.id}`)
          console.log(`  School certs found: ${schoolCertificates.length}`)
          console.log(`  Zone/National certs found: ${zoneNationalCertificates.length}`)
          console.log(`  Quiz certs found: ${quizCertificates.length}`)
          
          if (zoneNationalCertificates.length > 0) {
            zoneNationalCertificates.forEach(cert => {
              console.log(`    - Cert ID ${cert.id}: ${cert.templateName}`)
              console.log(`      ScopeArea: ${cert.scopeArea}, EventID: ${cert.eventId}`)
              console.log(`      FilePath: ${cert.filePath}`)
            })
          }
          
          if (quizCertificates.length > 0) {
            quizCertificates.forEach(cert => {
              console.log(`    - Quiz Cert ID ${cert.id}: ${cert.templateName}`)
              console.log(`      TargetType: ${cert.targetType}, QuizID: ${cert.quizId}`)
              console.log(`      FilePath: ${cert.filePath}`)
            })
          }
        }

        // Group certificates by criteria:
        // - School: targetType = 'GENERAL'
        // - State: event.scopeArea = 'ZONE' (can have both EVENT_PARTICIPANT and EVENT_WINNER)
        // - Online: event.scopeArea = 'ONLINE_STATE' (can have both EVENT_PARTICIPANT and EVENT_WINNER)
        // - National: event.scopeArea = 'NATIONAL' (can have both EVENT_PARTICIPANT and EVENT_WINNER)
        // - Quiz: targetType = 'QUIZ_PARTICIPANT' or 'QUIZ_WINNER'
        const schoolCert = schoolCertificates[0] || null
        const stateCerts = zoneNationalCertificates.filter(c => c.scopeArea === 'ZONE')
        const onlineCerts = zoneNationalCertificates.filter(c => c.scopeArea === 'ONLINE_STATE')
        const nationalCerts = zoneNationalCertificates.filter(c => c.scopeArea === 'NATIONAL')
        const quizCerts = quizCertificates

        const classDisplay = contestant.class_name 
          ? `${contestant.class_grade || ''} ${contestant.class_name}`.trim()
          : contestant.class_grade || '-'

        return {
          id: contestant.id,
          contestantId: contestant.id,
          name: contestant.name,
          ic: contestant.ic,
          class: classDisplay,
          team: contestant.teamMembers?.[0]?.team?.name || null,
          teamId: contestant.teamMembers?.[0]?.team?.id || null,
          contingent: contestant.contingent?.name,
          certificates: {
            school: schoolCert ? {
              id: schoolCert.id,
              templateName: schoolCert.template?.templateName || '',
              targetType: schoolCert.template?.targetType || '',
              filePath: schoolCert.filePath,
              uniqueCode: schoolCert.uniqueCode
            } : null,
            state: stateCerts.map(cert => ({
              id: cert.id,
              templateName: cert.templateName || '',
              targetType: cert.targetType || '',
              filePath: cert.filePath,
              uniqueCode: cert.uniqueCode
            })),
            online: onlineCerts.map(cert => ({
              id: cert.id,
              templateName: cert.templateName || '',
              targetType: cert.targetType || '',
              filePath: cert.filePath,
              uniqueCode: cert.uniqueCode
            })),
            national: nationalCerts.map(cert => ({
              id: cert.id,
              templateName: cert.templateName || '',
              targetType: cert.targetType || '',
              filePath: cert.filePath,
              uniqueCode: cert.uniqueCode
            })),
            quiz: quizCerts.map(cert => ({
              id: cert.id,
              templateName: cert.templateName || '',
              targetType: cert.targetType || '',
              filePath: cert.filePath,
              uniqueCode: cert.uniqueCode
            }))
          }
        }
      })
    )

    return NextResponse.json({ contestants: contestantsWithCerts })
  } catch (error) {
    console.error('Error fetching contestants with certificates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contestants' },
      { status: 500 }
    )
  }
}
