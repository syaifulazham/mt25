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
  action?: 'created' | 'updated' | 'assigned'
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
    const { attendanceTeamId, rank, contestId, manualMapping } = body

    if (!attendanceTeamId || !rank || !contestId) {
      return NextResponse.json(
        { error: 'Missing required fields: attendanceTeamId, rank, contestId' },
        { status: 400 }
      )
    }

    // manualMapping format: { memberIndex: certificateId }
    // e.g., { 0: 123, 1: 124, 2: 125 }
    const hasManualMapping = manualMapping && Object.keys(manualMapping).length > 0

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

    // Check for available pre-generated blank certificates for this rank
    // Fetch ALL blank certificates (one for each team member)
    const blankCertsForRank = await prisma.$queryRaw<any[]>`
      SELECT id, serialNumber, uniqueCode, filePath, ownership
      FROM certificate
      WHERE templateId = ${template.id}
        AND ic_number IS NULL
        AND JSON_EXTRACT(ownership, '$.preGenerated') = true
        AND JSON_EXTRACT(ownership, '$.rank') = ${rank}
        AND JSON_EXTRACT(ownership, '$.contestId') = ${contestId}
        AND JSON_EXTRACT(ownership, '$.eventId') = ${eventId}
      ORDER BY JSON_EXTRACT(ownership, '$.memberNumber') ASC
    `

    const hasBlankCerts = blankCertsForRank && blankCertsForRank.length > 0
    console.log(`Found ${blankCertsForRank.length} pre-generated certificates for rank ${rank}`)

    // Map each team member to a pre-generated certificate
    for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
      const member = members[memberIndex]
      try {
        // Get the corresponding pre-generated certificate for this team member
        let blankCert = null
        
        if (hasManualMapping && manualMapping[memberIndex]) {
          // Use manually selected certificate
          const mappedCertId = manualMapping[memberIndex]
          blankCert = blankCertsForRank.find(cert => cert.id === mappedCertId) || null
          console.log(`Manual mapping: Member ${memberIndex + 1} (${member.contestantName}) → Cert ID ${mappedCertId}`)
        } else if (hasBlankCerts && memberIndex < blankCertsForRank.length) {
          // Auto-map: Use certificate in order
          blankCert = blankCertsForRank[memberIndex]
          console.log(`Auto mapping: Member ${memberIndex + 1} (${member.contestantName}) → Cert ${blankCert.serialNumber}`)
        }
        
        // Generate unique code
        const uniqueCode = blankCert 
          ? blankCert.uniqueCode 
          : `WINNER-${eventId}-${contestId}-${member.contestantId}-${Date.now()}`
        
        // Check if certificate already exists for this contestant
        const existingCert = await prisma.certificate.findFirst({
          where: {
            ic_number: member.ic,
            templateId: template.id,
            awardTitle: awardTitle
          }
        })

        // Determine serial number source
        let serialNumber: string
        let usePreGenerated = false
        
        if (existingCert && existingCert.serialNumber) {
          // Use existing serial number from already assigned certificate
          serialNumber = existingCert.serialNumber
        } else if (blankCert && blankCert.serialNumber) {
          // Use serial number from pre-generated blank certificate
          serialNumber = blankCert.serialNumber
          usePreGenerated = true
          console.log(`Assigning pre-generated cert ${blankCert.serialNumber} to member ${memberIndex + 1}: ${member.contestantName}`)
        } else {
          // Generate new serial number using the service
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
          // Update existing certificate - preserve serialNumber, update all other details
          // Merge existing ownership with new assignment details
          const existingOwnership = typeof existingCert.ownership === 'string' 
            ? JSON.parse(existingCert.ownership) 
            : (existingCert.ownership || {})
          
          const updatedOwnership = {
            ...existingOwnership,
            year: new Date().getFullYear(),
            contingentId: Number(member.contingentId),
            contestantId: Number(member.contestantId),
            assignedFrom: usePreGenerated ? 'preGenerated' : 'direct',
            updatedAt: new Date().toISOString()
          }
          
          await prisma.$executeRaw`
            UPDATE certificate 
            SET 
              recipientName = ${member.contestantName},
              contingent_name = ${team.contingentName},
              contestName = ${team.contestName},
              ic_number = ${member.ic},
              awardTitle = ${awardTitle},
              uniqueCode = ${uniqueCode},
              filePath = ${pdfPath},
              status = 'READY',
              ownership = ${JSON.stringify(updatedOwnership)},
              updatedAt = NOW()
            WHERE id = ${existingCert.id}
          `

          results.success.push({
            member: member.contestantName,
            serialNumber: serialNumber,
            awardTitle: awardTitle,
            action: 'updated'
          })
        } else if (usePreGenerated && blankCert) {
          // Update pre-generated blank certificate with winner details
          // Parse existing ownership and merge with new member details
          const existingOwnership = typeof blankCert.ownership === 'string' 
            ? JSON.parse(blankCert.ownership) 
            : (blankCert.ownership || {})
          
          const updatedOwnership = {
            ...existingOwnership,
            // Add actual member assignment details
            year: new Date().getFullYear(),
            contingentId: Number(member.contingentId),
            contestantId: Number(member.contestantId),
            assignedFrom: 'preGenerated',
            assignedAt: new Date().toISOString(),
            // Keep pre-generation metadata
            preGeneratedAt: existingOwnership.generatedAt,
            originalMemberNumber: existingOwnership.memberNumber
          }
          
          await prisma.$executeRaw`
            UPDATE certificate 
            SET 
              recipientName = ${member.contestantName},
              contingent_name = ${team.contingentName},
              contestName = ${team.contestName},
              ic_number = ${member.ic},
              filePath = ${pdfPath},
              status = 'READY',
              ownership = ${JSON.stringify(updatedOwnership)},
              updatedAt = NOW()
            WHERE id = ${blankCert.id}
          `

          results.success.push({
            member: member.contestantName,
            serialNumber: serialNumber,
            awardTitle: awardTitle,
            action: 'assigned'
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
