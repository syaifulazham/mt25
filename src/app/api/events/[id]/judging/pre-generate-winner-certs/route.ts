import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import { generateCertificatePDF } from '@/lib/certificate-generator'
import { CertificateSerialService } from '@/lib/services/certificate-serial-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has required role
    const allowedRoles = ['ADMIN', 'OPERATOR']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const eventId = parseInt(params.id)
    const { contestId, ranks, rankingMode = 'national', allowRegenerate = false } = await request.json()

    if (!contestId || !ranks || !Array.isArray(ranks) || ranks.length === 0) {
      return NextResponse.json(
        { error: 'Contest ID and ranks array are required' },
        { status: 400 }
      )
    }

    // Get event and contest details
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const contest = await prisma.contest.findUnique({
      where: { id: contestId }
    })

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
    }

    // Get number of certificates per rank from maxMembersPerTeam
    const certsPerRank = contest.maxMembersPerTeam || 1

    // Find winner certificate templates for this event
    const templates = await prisma.certTemplate.findMany({
      where: {
        targetType: 'EVENT_WINNER',
        eventId: eventId,
        status: 'ACTIVE'
      }
    })

    if (templates.length === 0) {
      return NextResponse.json(
        { error: 'No active EVENT_WINNER templates found for this event' },
        { status: 404 }
      )
    }

    const results = {
      total: ranks.length,
      success: [] as any[],
      failed: [] as any[],
      skipped: [] as any[]
    }

    // Get states if state-based ranking
    let states: any[] = []
    if (rankingMode === 'state') {
      // Get all states participating in this event using attendanceTeam
      const statesQuery = `
        SELECT DISTINCT s.id, s.name
        FROM state s
        INNER JOIN attendanceTeam at ON s.id = at.stateId
        WHERE at.eventId = ${eventId}
        AND at.stateId IS NOT NULL
        ORDER BY s.name
      `
      states = await prisma.$queryRawUnsafe(statesQuery) as any[]
      
      // Update total count for results (includes certsPerRank)
      results.total = ranks.length * states.length * certsPerRank
    } else {
      // Update total count for national ranking
      results.total = ranks.length * certsPerRank
    }

    // Generate blank certificates for each rank (and each state if state-based)
    const ranksToProcess = rankingMode === 'state' && states.length > 0
      ? states.flatMap(state => ranks.map(rank => ({ rank, stateId: state.id, stateName: state.name })))
      : ranks.map(rank => ({ rank, stateId: null, stateName: null }))

    for (const { rank, stateId, stateName } of ranksToProcess) {
      if (!Number.isInteger(rank) || rank < 1) {
        results.failed.push({
          rank,
          reason: 'Invalid rank number'
        })
        continue
      }

      // Generate certsPerRank certificates for each rank
      for (let memberNumber = 1; memberNumber <= certsPerRank; memberNumber++) {
        try {
          // Check using JSON query if blank certificate already exists for this rank/member (and state if applicable)
          let existingByRank: any[]
          
          if (stateId) {
            existingByRank = await prisma.$queryRaw<any[]>`
              SELECT id, serialNumber, uniqueCode, filePath 
              FROM certificate 
              WHERE templateId = ${templates[0].id}
              AND ic_number IS NULL
              AND JSON_EXTRACT(ownership, '$.rank') = ${rank}
              AND JSON_EXTRACT(ownership, '$.memberNumber') = ${memberNumber}
              AND JSON_EXTRACT(ownership, '$.contestId') = ${contestId}
              AND JSON_EXTRACT(ownership, '$.eventId') = ${eventId}
              AND JSON_EXTRACT(ownership, '$.stateId') = ${stateId}
              LIMIT 1
            `
          } else {
            existingByRank = await prisma.$queryRaw<any[]>`
              SELECT id, serialNumber, uniqueCode, filePath 
              FROM certificate 
              WHERE templateId = ${templates[0].id}
              AND ic_number IS NULL
              AND JSON_EXTRACT(ownership, '$.rank') = ${rank}
              AND JSON_EXTRACT(ownership, '$.memberNumber') = ${memberNumber}
              AND JSON_EXTRACT(ownership, '$.contestId') = ${contestId}
              AND JSON_EXTRACT(ownership, '$.eventId') = ${eventId}
              AND JSON_EXTRACT(ownership, '$.stateId') IS NULL
              LIMIT 1
            `
          }

        if (existingByRank && existingByRank.length > 0) {
          if (allowRegenerate) {
            // Delete existing certificate and its file
            try {
              const existingCert = existingByRank[0]
              
              // Delete the PDF file if it exists
              if (existingCert.filePath) {
                const fs = require('fs')
                const path = require('path')
                const fullPath = path.join(process.cwd(), 'public', existingCert.filePath)
                if (fs.existsSync(fullPath)) {
                  fs.unlinkSync(fullPath)
                }
              }
              
              // Delete the certificate record
              await prisma.$executeRaw`
                DELETE FROM certificate WHERE id = ${existingCert.id}
              `
              
              console.log(`Deleted existing certificate ${existingCert.serialNumber} for regeneration`)
            } catch (deleteError) {
              console.error('Error deleting existing certificate:', deleteError)
              results.failed.push({
                rank,
                state: stateName,
                reason: `Failed to delete existing certificate: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`
              })
              continue
            }
          } else {
            // Skip if regenerate not allowed
            results.skipped.push({
              rank,
              memberNumber,
              state: stateName,
              reason: stateName 
                ? `Blank certificate already exists for rank ${rank} member ${memberNumber} (${stateName})`
                : `Blank certificate already exists for rank ${rank} member ${memberNumber}`,
              serialNumber: existingByRank[0].serialNumber
            })
            continue
          }
        }

        // Find a matching template for this rank
        const template = templates.find(
          t => rank >= (t.winnerRangeStart || 1) && rank <= (t.winnerRangeEnd || 999)
        ) || templates[0]

        // Generate award title based on rank
        const awardTitle = rank === 1 ? 'TEMPAT PERTAMA' : `TEMPAT KE-${rank}`

        // Generate unique code with member number
        const uniqueCode = `WIN-${eventId}-${contestId}-R${rank}-M${memberNumber}-${Date.now()}-${Math.random().toString(36).substring(7)}`
        
        // Generate serial number using transaction-safe service
        const year = new Date().getFullYear()
        const serialNumber = await CertificateSerialService.generateSerialNumber(
          template.id,
          'EVENT_WINNER',
          year
        )

        // Generate blank PDF with only contest/award details
        const contestNameWithCode = contest.code ? `${contest.code} - ${contest.name}` : contest.name
        
        const pdfPath = await generateCertificatePDF({
          template: {
            id: template.id,
            basePdfPath: template.basePdfPath || '',
            configuration: template.configuration
          },
          data: {
            recipient_name: '',
            award_title: awardTitle,
            contest_name: contestNameWithCode,
            serial_number: serialNumber,
            unique_code: uniqueCode,
            contingent_name: '',
            ic_number: ''
          }
        })

        // Create certificate record with NULL recipient details using raw SQL
        // Using raw SQL to allow NULL values for required fields
        const ownershipData = JSON.stringify({
          preGenerated: true,
          rank: rank,
          memberNumber: memberNumber,
          awardTitle: awardTitle,
          contestId: contestId,
          contestName: contestNameWithCode,
          eventId: eventId,
          eventName: event.name,
          rankingMode: rankingMode,
          maxMembersPerTeam: certsPerRank,
          ...(stateId && { stateId: stateId, stateName: stateName }),
          year: year,
          generatedAt: new Date().toISOString()
        })

        const userId = parseInt(session.user.id!)
        
        await prisma.$executeRaw`
          INSERT INTO certificate (
            templateId, recipientName, recipientType, contingent_name,
            ic_number, uniqueCode, serialNumber, awardTitle, filePath,
            status, createdBy, ownership, createdAt, updatedAt
          ) VALUES (
            ${template.id}, '', 'WINNER', '',
            NULL, ${uniqueCode}, ${serialNumber}, ${awardTitle}, ${pdfPath},
            'READY', ${userId}, ${ownershipData}, NOW(), NOW()
          )
        `
        
        const certificate = await prisma.certificate.findFirst({
          where: { uniqueCode }
        })

        results.success.push({
          rank,
          memberNumber,
          awardTitle,
          serialNumber,
          certificateId: certificate?.id || 0,
          ...(stateName && { state: stateName })
        })

        } catch (error) {
          console.error(`Failed to generate blank cert for rank ${rank} member ${memberNumber}:`, error)
          results.failed.push({
            rank,
            memberNumber,
            reason: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      } // end memberNumber loop
    } // end rank loop

    return NextResponse.json({
      success: true,
      message: 'Pre-generation completed',
      results
    })

  } catch (error) {
    console.error('Pre-generation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to pre-generate certificates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
