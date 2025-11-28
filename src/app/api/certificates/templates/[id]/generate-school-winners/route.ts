import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import { CertificateSerialService } from '@/lib/services/certificate-serial-service'
import { generateCertificatePDF } from '@/lib/certificate-generator'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templateId = parseInt(params.id)
    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    const { contestantIds, contestId, awardTitle } = await request.json()

    if (!Array.isArray(contestantIds) || contestantIds.length === 0) {
      return NextResponse.json(
        { error: 'Contestant IDs are required' },
        { status: 400 }
      )
    }

    if (!contestId) {
      return NextResponse.json(
        { error: 'Contest ID is required' },
        { status: 400 }
      )
    }

    if (!awardTitle || typeof awardTitle !== 'string') {
      return NextResponse.json(
        { error: 'Award title is required' },
        { status: 400 }
      )
    }

    // Verify the template exists and is of type SCHOOL_WINNER
    const template = await prisma.certTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check template type using string comparison
    const targetType = template.targetType as string
    if (targetType !== 'SCHOOL_WINNER') {
      return NextResponse.json(
        { error: 'Template is not for school winners' },
        { status: 400 }
      )
    }

    if (template.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Template is not active' },
        { status: 400 }
      )
    }

    // Find the participant to verify authorization
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email }
    })
    
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Get all contingents managed by this participant
    const managedContingents = await prisma.contingentManager.findMany({
      where: { participantId: participant.id },
      select: { contingentId: true }
    })
    
    const legacyContingents = await prisma.contingent.findMany({
      where: {
        managedByParticipant: true,
        participantId: participant.id
      },
      select: { id: true }
    })
    
    const contingentIds = [
      ...managedContingents.map(c => c.contingentId),
      ...legacyContingents.map(c => c.id)
    ]
    
    if (contingentIds.length === 0) {
      return NextResponse.json(
        { error: 'No contingents managed by this participant' },
        { status: 403 }
      )
    }

    // Fetch contest information
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        id: true,
        name: true,
        code: true
      }
    })

    if (!contest) {
      return NextResponse.json(
        { error: 'Contest not found' },
        { status: 404 }
      )
    }

    // Fetch contestants and verify they belong to managed contingents
    const contestants = await prisma.contestant.findMany({
      where: {
        id: { in: contestantIds },
        contingentId: { in: contingentIds }
      },
      include: {
        contingent: true,
        teamMembers: {
          include: {
            team: true
          }
        }
      }
    })

    if (contestants.length === 0) {
      return NextResponse.json(
        { error: 'No valid contestants found' },
        { status: 404 }
      )
    }

    // Generate certificates for each contestant
    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [] as Array<{ contestantId: number; name: string; error: string }>
    }

    for (const contestant of contestants) {
      try {
        // Check if certificate already exists
        const existingCertificate = await prisma.$queryRaw<Array<{
          id: number
          uniqueCode: string
          serialNumber: string | null
        }>>`
          SELECT id, uniqueCode, serialNumber
          FROM certificate
          WHERE templateId = ${templateId}
          AND ic_number = ${contestant.ic}
          AND status = 'READY'
          LIMIT 1
        `

        // Use existing uniqueCode and serialNumber, or generate new ones
        let uniqueCode: string
        let serialNumber: string | null
        
        if (existingCertificate && existingCertificate.length > 0) {
          // Regeneration: Preserve unique identifiers
          uniqueCode = existingCertificate[0].uniqueCode
          serialNumber = existingCertificate[0].serialNumber
        } else {
          // New certificate: Generate new identifiers
          uniqueCode = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
          serialNumber = await CertificateSerialService.generateSerialNumber(
            templateId,
            'SCHOOL_WINNER',
            new Date().getFullYear()
          )
        }

        // Generate PDF with template configuration
        const pdfPath = await generateCertificatePDF({
          template: {
            id: template.id,
            basePdfPath: template.basePdfPath || '',
            configuration: template.configuration
          },
          data: {
            recipient_name: contestant.name,
            contingent_name: contestant.contingent?.name || '',
            team_name: contestant.teamMembers[0]?.team?.name || '',
            contest_name: `${contest.code} - ${contest.name}`,
            contest_code: contest.code,
            award_title: awardTitle,
            serial_number: serialNumber || '',
            unique_code: uniqueCode,
            issue_date: new Date().toLocaleDateString('en-MY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          }
        })

        // Create or update certificate record
        if (existingCertificate && existingCertificate.length > 0) {
          // Update existing certificate
          await prisma.$executeRaw`
            UPDATE certificate
            SET filePath = ${pdfPath},
                status = 'READY',
                recipientName = ${contestant.name},
                contingent_name = ${contestant.contingent?.name || null},
                team_name = ${contestant.teamMembers[0]?.team?.name || null},
                updatedAt = NOW()
            WHERE id = ${existingCertificate[0].id}
          `
        } else {
          // Create new certificate record
          await prisma.$executeRaw`
            INSERT INTO certificate 
            (templateId, recipientName, recipientEmail, recipientType, ic_number,
             contingent_name, team_name, uniqueCode, serialNumber, filePath, 
             status, createdBy, ownership, createdAt, updatedAt)
            VALUES (
              ${templateId},
              ${contestant.name},
              ${contestant.email || null},
              'contestant',
              ${contestant.ic || null},
              ${contestant.contingent?.name || null},
              ${contestant.teamMembers[0]?.team?.name || null},
              ${uniqueCode},
              ${serialNumber},
              ${pdfPath},
              'READY',
              NULL,
              ${JSON.stringify({
                year: new Date().getFullYear(),
                contestantId: contestant.id,
                contingentId: contestant.contingentId,
                teamId: contestant.teamMembers[0]?.team?.id || null,
                participantEmail: session.user.email
              })},
              NOW(),
              NOW()
            )
          `
        }

        results.successCount++

      } catch (error: any) {
        console.error(`Error generating certificate for ${contestant.name}:`, error)
        results.failedCount++
        results.errors.push({
          contestantId: contestant.id,
          name: contestant.name,
          error: error.message || 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      generated: results.successCount,
      total: contestants.length,
      failed: results.failedCount,
      errors: results.errors.length > 0 ? results.errors : undefined
    })

  } catch (error) {
    console.error('Error generating school winner certificates:', error)
    return NextResponse.json(
      { error: 'Failed to generate certificates' },
      { status: 500 }
    )
  }
}
