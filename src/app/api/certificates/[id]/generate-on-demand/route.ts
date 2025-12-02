import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateCertificatePDF } from '@/lib/certificate-generator'
import * as path from 'path'
import * as fs from 'fs/promises'

export const dynamic = 'force-dynamic'

/**
 * On-Demand Certificate Generation
 * 
 * Generates PDF only when requested, reducing storage usage
 * If PDF already exists and is recent, returns existing file
 * If PDF is old or missing, regenerates it
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const certificateId = parseInt(params.id)

    // Fetch certificate with template
    const certificate = await prisma.$queryRaw<any[]>`
      SELECT 
        c.*,
        ct.basePdfPath,
        ct.configuration
      FROM certificate c
      JOIN cert_template ct ON ct.id = c.templateId
      WHERE c.id = ${certificateId}
      LIMIT 1
    `

    if (!certificate || certificate.length === 0) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    const cert = certificate[0]

    // Check if PDF exists and is recent (less than 24 hours old)
    let needsRegeneration = true
    if (cert.filePath) {
      const pdfPath = path.join(process.cwd(), 'public', cert.filePath)
      try {
        const stats = await fs.stat(pdfPath)
        const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60)
        
        if (ageInHours < 24) {
          // PDF exists and is recent, return it
          needsRegeneration = false
        }
      } catch {
        // PDF file doesn't exist, need to regenerate
        needsRegeneration = true
      }
    }

    // Generate PDF if needed
    if (needsRegeneration) {
      console.log(`Regenerating certificate ${certificateId}...`)
      
      const pdfPath = await generateCertificatePDF({
        template: {
          id: cert.templateId,
          basePdfPath: cert.basePdfPath || '',
          configuration: cert.configuration
        },
        data: {
          recipient_name: cert.recipientName,
          contingent_name: cert.contingent_name,
          serial_number: cert.serialNumber || '',
          unique_code: cert.uniqueCode,
          ic_number: cert.ic_number || '',
          issue_date: new Date(cert.createdAt).toLocaleDateString('en-MY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      })

      // Update database with new file path
      await prisma.$executeRaw`
        UPDATE certificate
        SET filePath = ${pdfPath},
            status = 'READY',
            updatedAt = NOW()
        WHERE id = ${certificateId}
      `

      cert.filePath = pdfPath
    }

    // Return PDF URL
    return NextResponse.json({
      success: true,
      certificate: {
        id: cert.id,
        uniqueCode: cert.uniqueCode,
        serialNumber: cert.serialNumber,
        filePath: cert.filePath,
        downloadUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}${cert.filePath}`
      }
    })

  } catch (error) {
    console.error('Error generating certificate on-demand:', error)
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    )
  }
}
