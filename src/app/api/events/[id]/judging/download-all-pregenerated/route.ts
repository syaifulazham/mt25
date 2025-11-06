import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import { PDFDocument } from 'pdf-lib'
import * as fs from 'fs'
import * as path from 'path'
import archiver from 'archiver'
import { Readable } from 'stream'

const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']
const BATCH_SIZE = 50

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

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
    const { certificateIds, contestId } = body

    if (!certificateIds || !Array.isArray(certificateIds) || certificateIds.length === 0) {
      return NextResponse.json(
        { error: 'Certificate IDs are required' },
        { status: 400 }
      )
    }

    // Fetch certificates with their file paths
    const certificates = await prisma.certificate.findMany({
      where: {
        id: { in: certificateIds },
        filePath: { not: null }
      },
      select: {
        id: true,
        serialNumber: true,
        filePath: true,
        ownership: true
      },
      orderBy: {
        serialNumber: 'asc'
      }
    })

    if (certificates.length === 0) {
      return NextResponse.json(
        { error: 'No certificates found with valid PDF files' },
        { status: 404 }
      )
    }

    // Create batches of 50 certificates
    const batches: typeof certificates[] = []
    for (let i = 0; i < certificates.length; i += BATCH_SIZE) {
      batches.push(certificates.slice(i, i + BATCH_SIZE))
    }

    // Create merged PDFs for each batch
    const mergedPdfs: { filename: string; buffer: Buffer }[] = []

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const mergedPdf = await PDFDocument.create()

      for (const cert of batch) {
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
        } catch (error) {
          console.error(`Error processing certificate ${cert.serialNumber}:`, error)
        }
      }

      const mergedPdfBytes = await mergedPdf.save()
      const batchNumber = batchIndex + 1
      const startSerial = batch[0]?.serialNumber?.replace(/\//g, '-') || `batch-${batchNumber}`
      const endSerial = batch[batch.length - 1]?.serialNumber?.replace(/\//g, '-') || ''
      
      const filename = `Certificates_Batch_${batchNumber}_${startSerial}${endSerial ? '_to_' + endSerial : ''}.pdf`
      
      mergedPdfs.push({
        filename,
        buffer: Buffer.from(mergedPdfBytes)
      })
    }

    // Create ZIP file
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    })

    // Add metadata file
    const metadata = {
      eventId,
      contestId,
      totalCertificates: certificates.length,
      batches: batches.length,
      batchSize: BATCH_SIZE,
      generatedAt: new Date().toISOString(),
      generatedBy: session.user.email
    }

    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' })

    // Add merged PDFs to ZIP
    mergedPdfs.forEach(({ filename, buffer }) => {
      archive.append(buffer, { name: filename })
    })

    // Finalize the archive
    archive.finalize()

    // Convert archive stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of archive) {
      chunks.push(Buffer.from(chunk))
    }
    const zipBuffer = Buffer.concat(chunks)

    // Create a readable stream from the buffer
    const stream = Readable.from(zipBuffer)

    // Set response headers for ZIP download
    const contestName = contestId ? `Contest_${contestId}` : 'All_Contests'
    const zipFilename = `PreGenerated_Certificates_${contestName}_Event_${eventId}_${new Date().toISOString().split('T')[0]}.zip`

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Failed to download all certificates:', error)
    return NextResponse.json(
      { 
        error: 'Failed to download certificates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
