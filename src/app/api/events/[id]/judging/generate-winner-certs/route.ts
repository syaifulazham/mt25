import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import { generateCertificatePDF } from '@/lib/certificate-generator'
import { CertificateSerialService } from '@/lib/services/certificate-serial-service'

const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

interface GenerationResult {
  member: string
  reason?: string
  serialNumber?: string
  awardTitle?: string
  action?: 'created' | 'updated'
}

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    const eventId = parseInt(params.id)
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { attendanceTeamId, rank, contestId } = body

    if (!attendanceTeamId || !rank || !contestId) {
      return NextResponse.json(
        { error: 'Missing required fields: attendanceTeamId, rank, contestId' },
        { status: 400 }
      )
    }

    // Get winner template for this event
    const template = await prisma.certTemplate.findFirst({
      where: {
        eventId: eventId,
        targetType: 'EVENT_WINNER',
        status: 'ACTIVE'
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'No active winner certificate template found for this event' },
        { status: 404 }
      )
    }

    // Get team details with contest name
    const teamQuery = `
      SELECT 
        at.Id as attendanceTeamId,
        at.teamId,
        t.name as teamName,
        t.contestId,
        CONCAT(contest.code, ' - ', contest.name) as contestName,
        c.id as contingentId,
        c.name as contingentName
      FROM attendanceTeam at
      JOIN team t ON at.teamId = t.id
      JOIN contest ON t.contestId = contest.id
      JOIN contingent c ON at.contingentId = c.id
      WHERE at.Id = ${attendanceTeamId} AND at.eventId = ${eventId}
    `

    const teamResults = await prisma.$queryRawUnsafe(teamQuery) as any[]
    
    if (teamResults.length === 0) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    const team = teamResults[0]

    // Get all team members (contestants)
    const membersQuery = `
      SELECT 
        con.id as contestantId,
        con.name as contestantName,
        con.ic,
        con.contingentId
      FROM teamMember tm
      JOIN contestant con ON tm.contestantId = con.id
      WHERE tm.teamId = ${team.teamId}
      ORDER BY con.name
    `

    const members = await prisma.$queryRawUnsafe(membersQuery) as any[]

    if (members.length === 0) {
      return NextResponse.json(
        { error: 'No team members found' },
        { status: 404 }
      )
    }

    // Determine award title based on rank
    const awardTitle = rank === 1 ? 'TEMPAT PERTAMA' : `TEMPAT KE-${rank}`

    // Generate certificates for all team members
    const results = {
      success: [] as GenerationResult[],
      failed: [] as GenerationResult[],
      total: members.length
    }

    for (const member of members) {
      try {
        // Generate unique code
        const uniqueCode = `WINNER-${eventId}-${contestId}-${member.contestantId}-${Date.now()}`
        
        // Check if certificate already exists
        const existingCert = await prisma.certificate.findFirst({
          where: {
            ic_number: member.ic,
            templateId: template.id,
            awardTitle: awardTitle
          }
        })

        // Generate or reuse serial number
        let serialNumber: string
        if (existingCert && existingCert.serialNumber) {
          // Use existing serial number
          serialNumber = existingCert.serialNumber
        } else {
          // Generate new serial number using the service (includes template ID)
          serialNumber = await CertificateSerialService.generateSerialNumber(
            template.id,
            'EVENT_WINNER',
            new Date().getFullYear()
          )
        }

        // Generate PDF
        const pdfPath = await generateCertificatePDF({
          template: {
            id: template.id,
            basePdfPath: template.basePdfPath || '',
            configuration: template.configuration
          },
          data: {
            recipient_name: member.contestantName,
            award_title: awardTitle,
            contingent_name: team.contingentName,
            contest_name: team.contestName,
            ic_number: member.ic,
            unique_code: uniqueCode,
            serial_number: serialNumber
          }
        })

        if (existingCert) {
          // Update existing certificate
          await prisma.$executeRaw`
            UPDATE certificate 
            SET 
              recipientName = ${member.contestantName},
              contingent_name = ${team.contingentName},
              contestName = ${team.contestName},
              filePath = ${pdfPath},
              status = 'READY',
              ownership = ${JSON.stringify({
                year: new Date().getFullYear(),
                contingentId: Number(member.contingentId),
                contestantId: Number(member.contestantId)
              })},
              updatedAt = NOW()
            WHERE id = ${existingCert.id}
          `

          results.success.push({
            member: member.contestantName,
            serialNumber: serialNumber,
            awardTitle: awardTitle,
            action: 'updated'
          })
        } else {
          // Create new certificate record using raw SQL to avoid BigInt issues
          await prisma.$executeRaw`
            INSERT INTO certificate 
            (templateId, recipientName, recipientType, contingent_name, contestName, ic_number,
             uniqueCode, serialNumber, awardTitle, filePath, status, 
             ownership, createdBy, createdAt, updatedAt)
            VALUES (
              ${template.id}, ${member.contestantName}, 'PARTICIPANT',
              ${team.contingentName}, ${team.contestName}, ${member.ic}, ${uniqueCode}, ${serialNumber},
              ${awardTitle}, ${pdfPath}, 'READY',
              ${JSON.stringify({
                year: new Date().getFullYear(),
                contingentId: Number(member.contingentId),
                contestantId: Number(member.contestantId)
              })},
              ${session.user.id}, NOW(), NOW()
            )
          `

          results.success.push({
            member: member.contestantName,
            serialNumber: serialNumber,
            awardTitle: awardTitle,
            action: 'created'
          })
        }

      } catch (error) {
        console.error(`Failed to generate certificate for ${member.contestantName}:`, error)
        results.failed.push({
          member: member.contestantName,
          reason: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: 'Certificate generation completed',
      results: results,
      teamName: team.teamName,
      rank: rank,
      awardTitle: awardTitle
    })

  } catch (error) {
    console.error('Failed to generate winner certificates:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate certificates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
