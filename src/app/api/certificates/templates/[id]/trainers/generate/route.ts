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
    const { managerIds, generateWithoutFiles = false } = body

    if (!Array.isArray(managerIds) || managerIds.length === 0) {
      return NextResponse.json(
        { error: 'managerIds array is required' },
        { status: 400 }
      )
    }

    console.log(`Trainer certificate generation mode: ${generateWithoutFiles ? 'On-demand (no physical files)' : 'Legacy (with physical files)'}`)

    // Get template with configuration
    const template = await prisma.certTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.targetType?.toString() !== 'TRAINERS') {
      return NextResponse.json(
        { error: 'This template is not for trainers' },
        { status: 400 }
      )
    }

    const results = {
      generated: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ managerId: number; error: string }>
    }

    // Process each manager (trainer)
    for (const managerId of managerIds) {
      try {
        // Get manager details with related attendance and contingent info
        const manager = await prisma.manager.findUnique({
          where: { id: managerId },
          include: {
            team: {
              include: {
                contingent: {
                  include: {
                    school: {
                      select: {
                        name: true,
                        state: {
                          select: {
                            name: true
                          }
                        }
                      }
                    },
                    higherInstitution: {
                      select: {
                        name: true,
                        state: {
                          select: {
                            name: true
                          }
                        }
                      }
                    },
                    independent: {
                      select: {
                        name: true,
                        state: {
                          select: {
                            name: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        })

        if (!manager) {
          results.failed++
          results.errors.push({ managerId, error: 'Manager not found' })
          continue
        }

        // Get attendance record with related data
        // First try attendanceManager
        let attendanceRecord = await prisma.attendanceManager.findFirst({
          where: { managerId: managerId }
        }) as any

        // If not found in attendanceManager, check if this is a late addition via attendanceTeam
        if (!attendanceRecord) {
          const teamAttendance = await prisma.$queryRaw`
            SELECT 
              at.eventId,
              t.contingentId
            FROM attendanceTeam at
            INNER JOIN team t ON at.teamId = t.id
            INNER JOIN manager_team mt ON t.id = mt.teamId
            WHERE mt.managerId = ${managerId}
            LIMIT 1
          ` as any[]

          if (teamAttendance && teamAttendance.length > 0) {
            // Use team attendance data
            attendanceRecord = {
              eventId: Number(teamAttendance[0].eventId),
              contingentId: Number(teamAttendance[0].contingentId)
            }
          }
        }

        if (!attendanceRecord) {
          results.failed++
          results.errors.push({ managerId, error: 'No attendance record found' })
          continue
        }

        // Get event and contingent separately
        const event = attendanceRecord.eventId ? await prisma.event.findUnique({
          where: { id: attendanceRecord.eventId },
          select: { name: true }
        }) : null

        const contingent = attendanceRecord.contingentId ? await prisma.contingent.findUnique({
          where: { id: attendanceRecord.contingentId },
          select: { 
            name: true,
            school: { select: { name: true, state: { select: { name: true } } } },
            higherInstitution: { select: { name: true, state: { select: { name: true } } } },
            independent: { select: { name: true, state: { select: { name: true } } } }
          }
        }) : null

        // Check if certificate already exists
        const existingCert = await prisma.certificate.findFirst({
          where: {
            ic_number: manager.ic,
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

        // Get institution name from fetched contingent data
        const institutionName = contingent?.school?.name ||
          contingent?.higherInstitution?.name ||
          contingent?.independent?.name ||
          ''

        const stateName = contingent?.school?.state?.name ||
          contingent?.higherInstitution?.state?.name ||
          contingent?.independent?.state?.name ||
          ''

        // Generate PDF conditionally based on mode
        let pdfPath: string | null = null
        
        if (!generateWithoutFiles) {
          // Legacy mode: Generate physical PDF file
          pdfPath = await generateCertificatePDF({
            template: {
              id: template.id,
              basePdfPath: template.basePdfPath || '',
              configuration: configuration
            },
            data: {
              recipient_name: manager.name,
              contingent_name: contingent?.name || '',
              institution_name: institutionName,
              event_name: event?.name || '',
              unique_code: uniqueCode,
              serial_number: serialNumber || '',
              ic_number: manager.ic
            } as any
          })
        }
        // On-demand mode: Skip PDF generation, will generate when downloaded

        // Create or update certificate record
        if (existingCert) {
          // Update existing certificate - only update PDF path and status
          // Keep serialNumber, uniqueCode unchanged
          await prisma.certificate.update({
            where: { id: existingCert.id },
            data: {
              filePath: pdfPath,
              status: 'READY',
              updatedAt: new Date()
            }
          })
          results.updated++
        } else {
          // Create new certificate with all required fields
          await prisma.certificate.create({
            data: {
              recipientName: manager.name,
              recipientType: 'TRAINER',
              recipientEmail: manager.email,
              ic_number: manager.ic,
              uniqueCode: uniqueCode,
              serialNumber: serialNumber,
              filePath: pdfPath,
              status: 'READY',
              templateId: templateId,
              createdBy: parseInt(session.user.id as string)
            }
          } as any) // Keep 'as any' for createdBy compatibility
          results.generated++
        }

      } catch (error) {
        console.error(`Error generating certificate for manager ${managerId}:`, error)
        results.failed++
        results.errors.push({ 
          managerId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${results.generated} new certificates, updated ${results.updated}, failed ${results.failed}`,
      results
    })

  } catch (error) {
    console.error('Error in trainer certificate generation:', error)
    return NextResponse.json(
      { error: 'Failed to generate certificates' },
      { status: 500 }
    )
  }
}
