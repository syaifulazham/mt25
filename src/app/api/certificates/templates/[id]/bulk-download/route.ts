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
  ownership: any
}

interface CertificateWithState extends Certificate {
  stateName?: string | null
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
        ic_number: true,
        ownership: true
      },
      orderBy: [
        { contingent_name: 'asc' },
        { recipientName: 'asc' }
      ]
    }) as Certificate[]

    if (certificates.length === 0) {
      return NextResponse.json({ error: 'No certificates found' }, { status: 404 })
    }

    // If merging by state, fetch state information for all certificates
    let certificatesWithState: CertificateWithState[] = certificates
    if (mergingType === 'merge_by_state') {
      certificatesWithState = await enrichCertificatesWithState(certificates)
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
            await processSplitPDFs(archive, certificatesWithState, downloadType)
          } else if (mergingType === 'merge_all') {
            // Merge all into single PDF
            await processMergeAll(archive, certificatesWithState, template.templateName)
          } else if (mergingType === 'merge_by_contingent') {
            // Merge by contingent
            await processMergeByContingent(archive, certificatesWithState, downloadType)
          } else if (mergingType === 'merge_by_state') {
            // Merge by state
            await processMergeByState(archive, certificatesWithState, downloadType)
          } else if (mergingType === 'merge_every_n') {
            // Merge every N files
            await processMergeEveryN(archive, certificatesWithState, mergeEveryN || 10, downloadType)
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

// Helper function: Enrich certificates with state information
async function enrichCertificatesWithState(certificates: Certificate[]): Promise<CertificateWithState[]> {
  const enriched: CertificateWithState[] = []

  for (const cert of certificates) {
    let stateName: string | null = null

    try {
      // Extract contingentId from ownership JSON
      const ownership = cert.ownership as any
      const contingentId = ownership?.contingentId

      if (contingentId) {
        // Query to get state name from contingent -> school/independent -> state
        const result = await prisma.$queryRaw<Array<{ stateName: string }>>`
          SELECT DISTINCT s.name as stateName
          FROM contingent c
          LEFT JOIN school sch ON c.schoolId = sch.id
          LEFT JOIN independent ind ON c.independentId = ind.id
          LEFT JOIN state s ON (sch.stateId = s.id OR ind.stateId = s.id)
          WHERE c.id = ${contingentId}
          LIMIT 1
        `

        if (result && result.length > 0) {
          stateName = result[0].stateName
        }
      }
    } catch (error) {
      console.error(`Error fetching state for certificate ${cert.id}:`, error)
    }

    enriched.push({
      ...cert,
      stateName
    })
  }

  return enriched
}

// Helper function: Process split PDFs
async function processSplitPDFs(
  archive: Archiver,
  certificates: CertificateWithState[],
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
  certificates: CertificateWithState[],
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

// Helper function: Merge PDFs by contingent
async function processMergeByContingent(
  archive: Archiver,
  certificates: CertificateWithState[],
  downloadType: string
) {
  // Group certificates by contingent
  const grouped = new Map<string, CertificateWithState[]>()
  
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

// Helper function: Merge PDFs by state (SELANGOR, PERAK, etc.)
async function processMergeByState(
  archive: Archiver,
  certificates: CertificateWithState[],
  downloadType: string
) {
  // Group certificates by state
  const grouped = new Map<string, CertificateWithState[]>()
  
  for (const cert of certificates) {
    const key = cert.stateName || 'Unknown'
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(cert)
  }

  // Merge each group
  for (const [stateName, certs] of grouped.entries()) {
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
    const fileName = `${sanitizeFileName(stateName)}-certificates.pdf`
    const folderPath = downloadType === 'state_folders' 
      ? `${sanitizeFileName(stateName)}/`
      : ''

    archive.append(Buffer.from(mergedPdfBytes), { 
      name: `${folderPath}${fileName}` 
    })
  }
}

// Helper function: Merge every N PDFs
async function processMergeEveryN(
  archive: Archiver,
  certificates: CertificateWithState[],
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
