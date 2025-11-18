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
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const allowedRoles = ['ADMIN', 'OPERATOR']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const templateId = parseInt(params.id)
    const { contingentIds } = await request.json()

    if (!Array.isArray(contingentIds) || contingentIds.length === 0) {
      return NextResponse.json(
        { error: 'contingentIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Verify template exists and is CONTINGENT type
    const template = await prisma.certTemplate.findUnique({
      where: { id: templateId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.targetType !== 'CONTINGENT') {
      return NextResponse.json(
        { error: 'Template is not a CONTINGENT type' },
        { status: 400 }
      )
    }

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [] as { contingentId: number; error: string }[]
    }

    // Process each contingent
    for (const contingentId of contingentIds) {
      try {
        // Fetch contingent details with state information
        const contingent = await prisma.$queryRaw<any[]>`
          SELECT 
            c.id,
            c.name,
            c.contingentType,
            COALESCE(
              sch.stateId,
              hi.stateId,
              ind.stateId
            ) as stateId,
            COALESCE(
              st_sch.name,
              st_hi.name,
              st_ind.name
            ) as stateName
          FROM contingent c
          LEFT JOIN school sch ON sch.id = c.schoolId
          LEFT JOIN state st_sch ON st_sch.id = sch.stateId
          LEFT JOIN higherinstitution hi ON hi.id = c.higherInstId
          LEFT JOIN state st_hi ON st_hi.id = hi.stateId
          LEFT JOIN independent ind ON ind.id = c.independentId
          LEFT JOIN state st_ind ON st_ind.id = ind.stateId
          WHERE c.id = ${contingentId}
          LIMIT 1
        `

        if (!contingent || contingent.length === 0) {
          results.failedCount++
          results.errors.push({
            contingentId,
            error: 'Contingent not found'
          })
          continue
        }

        const contingentData = contingent[0]

        // Check if certificate already exists
        const existingCertificate = await prisma.$queryRaw<any[]>`
          SELECT id, uniqueCode, serialNumber
          FROM certificate
          WHERE templateId = ${templateId}
          AND JSON_EXTRACT(ownership, '$.contingentId') = ${contingentId}
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
            'CONTINGENT',
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
            recipient_name: contingentData.name,
            contingent_name: contingentData.name,
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
          // Update existing certificate - keep serialNumber, uniqueCode
          await prisma.$executeRaw`
            UPDATE certificate
            SET filePath = ${pdfPath},
                status = 'READY',
                recipientName = ${contingentData.name},
                contingent_name = ${contingentData.name},
                updatedAt = NOW()
            WHERE id = ${existingCertificate[0].id}
          `
        } else {
          // Create new certificate record
          await prisma.$executeRaw`
            INSERT INTO certificate 
            (templateId, recipientName, recipientType, contingent_name, 
             uniqueCode, serialNumber, filePath, status, createdBy, ownership, createdAt, updatedAt)
            VALUES (
              ${templateId},
              ${contingentData.name},
              'CONTINGENT',
              ${contingentData.name},
              ${uniqueCode},
              ${serialNumber},
              ${pdfPath},
              'READY',
              ${session.user.id},
              ${JSON.stringify({
                year: new Date().getFullYear(),
                contingentId: contingentData.id
              })},
              NOW(),
              NOW()
            )
          `
        }

        results.successCount++

      } catch (error: any) {
        console.error(`Error generating certificate for contingent ${contingentId}:`, error)
        results.failedCount++
        results.errors.push({
          contingentId,
          error: error.message || 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      successCount: results.successCount,
      failedCount: results.failedCount,
      errors: results.errors
    })

  } catch (error) {
    console.error('Error generating contingent certificates:', error)
    return NextResponse.json(
      { error: 'Failed to generate certificates' },
      { status: 500 }
    )
  }
}
