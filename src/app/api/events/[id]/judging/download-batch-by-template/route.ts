import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import { PDFDocument } from 'pdf-lib'
import * as fs from 'fs'
import * as path from 'path'

const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 1 minute should be enough for individual batches

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
    const body = await request.json()
    const { templateId, batchNumber, batchSize } = body

    if (!templateId || !batchNumber || !batchSize) {
      return NextResponse.json(
        { error: 'Template ID, batch number, and batch size are required' },
        { status: 400 }
      )
    }

    console.log(`[Download Batch] Fetching batch ${batchNumber} for template ${templateId}`)

    // Calculate offset for this batch
    const offset = (batchNumber - 1) * batchSize
    
    // Fetch certificates for this specific batch
    const certificates = await prisma.$queryRaw<any[]>`
      SELECT 
        id,
        templateId,
        serialNumber,
        filePath,
        uniqueCode,
        awardTitle,
        ownership
      FROM certificate
      WHERE ic_number IS NULL
        AND templateId = ${parseInt(templateId)}
        AND JSON_EXTRACT(ownership, '$.preGenerated') = true
        AND JSON_EXTRACT(ownership, '$.eventId') = ${eventId}
        AND filePath IS NOT NULL
      ORDER BY 
        JSON_EXTRACT(ownership, '$.contestId'),
        JSON_EXTRACT(ownership, '$.rank'),
        JSON_EXTRACT(ownership, '$.memberNumber')
      LIMIT ${batchSize} OFFSET ${offset}
    `

    console.log(`[Download Batch] Found ${certificates.length} certificates for batch ${batchNumber}`)

    if (certificates.length === 0) {
      return NextResponse.json(
        { error: 'No certificates found for this batch' },
        { status: 404 }
      )
    }

    // Create merged PDF for this batch
    const mergedPdf = await PDFDocument.create()
    let processedCount = 0

    for (const cert of certificates) {
      if (!cert.filePath) continue

      try {
        const pdfPath = path.join(process.cwd(), 'public', cert.filePath)
        
        if (!fs.existsSync(pdfPath)) {
          console.warn(`PDF file not found: ${pdfPath}`)
          continue
        }

        const pdfBytes = fs.readFileSync(pdfPath)
        const pdf = await PDFDocument.load(pdfBytes)
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page)
        })
        processedCount++
      } catch (error) {
        console.error(`Error processing certificate ${cert.serialNumber}:`, error)
      }
    }

    console.log(`[Download Batch] Processed ${processedCount}/${certificates.length} certificates`)

    const mergedPdfBytes = await mergedPdf.save()
    
    // Generate filename
    const startSerial = certificates[0]?.serialNumber?.replace(/\//g, '-') || `batch-${batchNumber}`
    const endSerial = certificates[certificates.length - 1]?.serialNumber?.replace(/\//g, '-') || ''
    const filename = `Certificates_Batch_${batchNumber}_${startSerial}${endSerial ? '_to_' + endSerial : ''}.pdf`

    console.log(`[Download Batch] Sending PDF: ${filename} (${(mergedPdfBytes.length / (1024 * 1024)).toFixed(2)} MB)`)

    // Convert to Buffer for NextResponse
    const buffer = Buffer.from(mergedPdfBytes)

    // Return the PDF directly
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Failed to download batch:', error)
    return NextResponse.json(
      { 
        error: 'Failed to download batch',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
