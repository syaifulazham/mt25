import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import archiver, { Archiver } from 'archiver'
import { PDFDocument } from 'pdf-lib'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface Certificate {
  id: number
  recipientName: string
  filePath: string | null
  contingent_name: string | null
  ic_number: string | null
}

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
    const { mergingType, downloadType, mergeEveryN } = body

    // Get template
    const template = await prisma.certTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        templateName: true
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Get all generated certificates for this template
    const certificates = await prisma.certificate.findMany({
      where: {
        templateId: templateId,
        filePath: { not: null },
        status: 'READY'
      },
      select: {
        id: true,
        recipientName: true,
        filePath: true,
        contingent_name: true,
        ic_number: true
      },
      orderBy: [
        { contingent_name: 'asc' },
        { recipientName: 'asc' }
      ]
    }) as Certificate[]

    if (certificates.length === 0) {
      return NextResponse.json({ error: 'No certificates found' }, { status: 404 })
    }

    // Create a passthrough stream for the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create archiver instance
          const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
          })

          // Pipe archive data to controller
          archive.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk))
          })

          archive.on('end', () => {
            controller.close()
          })

          archive.on('error', (err: Error) => {
            console.error('Archive error:', err)
            controller.error(err)
          })

          // Process based on merging type
          if (mergingType === 'split') {
            // Each certificate as separate PDF
            await processSplitPDFs(archive, certificates, downloadType)
          } else if (mergingType === 'merge_all') {
            // Merge all into single PDF
            await processMergeAll(archive, certificates, template.templateName)
          } else if (mergingType === 'merge_by_state') {
            // Merge by state/contingent
            await processMergeByState(archive, certificates, downloadType)
          } else if (mergingType === 'merge_every_n') {
            // Merge every N files
            await processMergeEveryN(archive, certificates, mergeEveryN || 10, downloadType)
          }

          // Finalize the archive
          await archive.finalize()
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="certificates-${template.templateName}-${Date.now()}.zip"`
      }
    })
  } catch (error) {
    console.error('Error in bulk download:', error)
    return NextResponse.json(
      { error: 'Failed to download certificates' },
      { status: 500 }
    )
  }
}

// Helper function: Process split PDFs
async function processSplitPDFs(
  archive: Archiver,
  certificates: Certificate[],
  downloadType: string
) {
  for (const cert of certificates) {
    if (!cert.filePath) continue

    const pdfPath = path.join(process.cwd(), 'public', cert.filePath)
    if (!fs.existsSync(pdfPath)) continue

    const fileName = `${sanitizeFileName(cert.recipientName)}-${cert.ic_number || cert.id}.pdf`
    const folderPath = downloadType === 'state_folders' 
      ? `${sanitizeFileName(cert.contingent_name || 'Unknown')}/`
      : ''

    archive.file(pdfPath, { name: `${folderPath}${fileName}` })
  }
}

// Helper function: Merge all PDFs into one
async function processMergeAll(
  archive: Archiver,
  certificates: Certificate[],
  templateName: string
) {
  const mergedPdf = await PDFDocument.create()

  for (const cert of certificates) {
    if (!cert.filePath) continue

    const pdfPath = path.join(process.cwd(), 'public', cert.filePath)
    if (!fs.existsSync(pdfPath)) continue

    try {
      const pdfBytes = fs.readFileSync(pdfPath)
      const pdf = await PDFDocument.load(pdfBytes)
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach((page) => mergedPdf.addPage(page))
    } catch (error) {
      console.error(`Error merging PDF for ${cert.recipientName}:`, error)
    }
  }

  const mergedPdfBytes = await mergedPdf.save()
  archive.append(Buffer.from(mergedPdfBytes), { 
    name: `${sanitizeFileName(templateName)}-all-certificates.pdf` 
  })
}

// Helper function: Merge PDFs by state/contingent
async function processMergeByState(
  archive: Archiver,
  certificates: Certificate[],
  downloadType: string
) {
  // Group certificates by contingent
  const grouped = new Map<string, Certificate[]>()
  
  for (const cert of certificates) {
    const key = cert.contingent_name || 'Unknown'
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(cert)
  }

  // Merge each group
  for (const [contingentName, certs] of grouped.entries()) {
    const mergedPdf = await PDFDocument.create()

    for (const cert of certs) {
      if (!cert.filePath) continue

      const pdfPath = path.join(process.cwd(), 'public', cert.filePath)
      if (!fs.existsSync(pdfPath)) continue

      try {
        const pdfBytes = fs.readFileSync(pdfPath)
        const pdf = await PDFDocument.load(pdfBytes)
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        copiedPages.forEach((page) => mergedPdf.addPage(page))
      } catch (error) {
        console.error(`Error merging PDF for ${cert.recipientName}:`, error)
      }
    }

    const mergedPdfBytes = await mergedPdf.save()
    const fileName = `${sanitizeFileName(contingentName)}-certificates.pdf`
    const folderPath = downloadType === 'state_folders' 
      ? `${sanitizeFileName(contingentName)}/`
      : ''

    archive.append(Buffer.from(mergedPdfBytes), { 
      name: `${folderPath}${fileName}` 
    })
  }
}

// Helper function: Merge every N PDFs
async function processMergeEveryN(
  archive: Archiver,
  certificates: Certificate[],
  n: number,
  downloadType: string
) {
  const batches = []
  for (let i = 0; i < certificates.length; i += n) {
    batches.push(certificates.slice(i, i + n))
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const mergedPdf = await PDFDocument.create()

    for (const cert of batch) {
      if (!cert.filePath) continue

      const pdfPath = path.join(process.cwd(), 'public', cert.filePath)
      if (!fs.existsSync(pdfPath)) continue

      try {
        const pdfBytes = fs.readFileSync(pdfPath)
        const pdf = await PDFDocument.load(pdfBytes)
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        copiedPages.forEach((page) => mergedPdf.addPage(page))
      } catch (error) {
        console.error(`Error merging PDF for ${cert.recipientName}:`, error)
      }
    }

    const mergedPdfBytes = await mergedPdf.save()
    const fileName = `certificates-batch-${i + 1}.pdf`
    
    // For state folders, group by contingent of first cert in batch
    const folderPath = downloadType === 'state_folders' && batch[0]?.contingent_name
      ? `${sanitizeFileName(batch[0].contingent_name)}/`
      : ''

    archive.append(Buffer.from(mergedPdfBytes), { 
      name: `${folderPath}${fileName}` 
    })
  }
}

// Helper function: Sanitize file names
function sanitizeFileName(name: string | null | undefined): string {
  if (!name) return 'unnamed'
  return name
    .replace(/[^a-z0-9\s\-_]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
}
