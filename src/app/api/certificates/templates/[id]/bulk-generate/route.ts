import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import { generateCertificatePDF } from '@/lib/certificate-generator'
import { CertificateSerialService } from '@/lib/services/certificate-serial-service'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const templateId = parseInt(params.id)
    const body = await request.json()
    const { contestantIds } = body

    if (!Array.isArray(contestantIds) || contestantIds.length === 0) {
      return NextResponse.json(
        { error: 'contestantIds array is required' },
        { status: 400 }
      )
    }

    // Get template with configuration
    const template = await prisma.certTemplate.findUnique({
      where: { id: templateId },
      include: {
        event: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.targetType !== 'EVENT_PARTICIPANT') {
      return NextResponse.json(
        { error: 'This template is not for event participants' },
        { status: 400 }
      )
    }

    const results = {
      generated: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ contestantId: number; error: string }>
    }

    // Process each contestant
    for (const contestantId of contestantIds) {
      try {
        // Get contestant details
        const contestant = await prisma.contestant.findUnique({
          where: { id: contestantId },
          include: {
            contingent: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    name: true
                  }
                },
                higherInstitution: {
                  select: {
                    name: true
                  }
                },
                independent: {
                  select: {
                    name: true
                  }
                }
              }
            },
            teamMembers: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                    contestId: true
                  }
                }
              },
              take: 1
            }
          }
        })

        if (!contestant) {
          results.failed++
          results.errors.push({ contestantId, error: 'Contestant not found' })
          continue
        }

        // Get contest information from attendanceContestant
        const attendanceRecord = await prisma.attendanceContestant.findFirst({
          where: {
            contestantId: contestantId,
            eventId: template.eventId || 0
          },
          select: {
            contestId: true
          }
        })

        if (!attendanceRecord) {
          results.failed++
          results.errors.push({ contestantId, error: 'Attendance record not found' })
          continue
        }

        // Fetch contest details if contestId exists
        let contest = null
        if (attendanceRecord.contestId) {
          contest = await prisma.contest.findUnique({
            where: { id: attendanceRecord.contestId },
            select: {
              code: true,
              name: true
            }
          })
        }

        // Check if certificate already exists
        const existingCert = await prisma.certificate.findFirst({
          where: {
            ic_number: contestant.ic,
            templateId: templateId
          }
        })

        // Use existing uniqueCode and serialNumber, or generate new ones
        let uniqueCode: string
        let serialNumber: string | null
        
        if (existingCert) {
          // Regeneration: Preserve unique identifiers
          uniqueCode = existingCert.uniqueCode
          serialNumber = existingCert.serialNumber
        } else {
          // New certificate: Generate new identifiers
          uniqueCode = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
          serialNumber = await CertificateSerialService.generateSerialNumber(templateId, template.targetType)
        }

        // Parse template configuration
        const configuration = template.configuration as any

        // Get institution name from contingent
        const institutionName = contestant.contingent?.school?.name ||
          contestant.contingent?.higherInstitution?.name ||
          contestant.contingent?.independent?.name ||
          ''

        // Get team name if contestant is part of a team
        const teamName = contestant.teamMembers?.[0]?.team?.name || ''

        // Get contest name from attendanceContestant (format: code + name)
        const contestName = contest 
          ? `${contest.code} ${contest.name}`
          : ''

        // Generate PDF
        const pdfPath = await generateCertificatePDF({
          template: {
            id: template.id,
            basePdfPath: template.basePdfPath || '',
            configuration: configuration
          },
          data: {
            recipient_name: contestant.name,
            contingent_name: contestant.contingent?.name || '',
            team_name: teamName,
            unique_code: uniqueCode,
            serial_number: serialNumber || '',
            ic_number: contestant.ic || '',
            institution_name: institutionName,
            issue_date: new Date().toLocaleDateString(),
            contest_name: contestName
          }
        })

        // Prepare ownership data
        const ownership = {
          year: new Date().getFullYear(),
          contingentId: contestant.contingent?.id || 0,
          contestantId: contestant.id
        }

        // Create or update certificate
        if (existingCert) {
          // Regeneration: Update existing certificate with new data
          // Preserve: ic_number, uniqueCode, serialNumber (these are the unique identifiers)
          await prisma.certificate.update({
            where: { id: existingCert.id },
            data: {
              recipientName: contestant.name,
              recipientEmail: contestant.email,
              recipientType: 'PARTICIPANT',
              contingent_name: contestant.contingent?.name || '',
              team_name: teamName,
              contestName: contestName,
              awardTitle: null, // Event participants typically don't have awards
              filePath: pdfPath,
              status: 'READY',
              issuedAt: new Date(),
              updatedAt: new Date(),
              ownership: ownership as any
            }
          })
          results.updated++
        } else {
          // Create new certificate
          await prisma.certificate.create({
            data: {
              templateId,
              recipientName: contestant.name,
              recipientEmail: contestant.email,
              recipientType: 'PARTICIPANT',
              contingent_name: contestant.contingent?.name || '',
              team_name: teamName,
              contestName: contestName,
              ic_number: contestant.ic,
              uniqueCode,
              serialNumber,
              filePath: pdfPath,
              status: 'READY',
              issuedAt: new Date(),
              createdBy: parseInt(String(session.user.id)),
              ownership: ownership as any
            }
          })
          results.generated++
        }
      } catch (error) {
        console.error(`Error generating certificate for contestant ${contestantId}:`, error)
        results.failed++
        results.errors.push({
          contestantId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      generated: results.generated,
      updated: results.updated,
      failed: results.failed,
      errors: results.errors
    })
  } catch (error) {
    console.error('Error in bulk certificate generation:', error)
    return NextResponse.json(
      { error: 'Failed to generate certificates' },
      { status: 500 }
    )
  }
}
