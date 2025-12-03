import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'
import { PDFGeneratorService } from '@/lib/services/pdf-generator-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const certificateId = parseInt(params.id)
    
    if (isNaN(certificateId)) {
      return NextResponse.json(
        { error: 'Invalid certificate ID' },
        { status: 400 }
      )
    }

    // Fetch certificate from database
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      select: {
        filePath: true,
        uniqueCode: true,
        recipientName: true,
        template: {
          select: {
            templateName: true
          }
        }
      }
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    let fileBuffer: Uint8Array;

    // Check if physical file exists or generate on-demand
    if (certificate.filePath) {
      // Legacy mode: Physical file exists, read from disk
      console.log('Using physical file:', certificate.filePath);
      
      let filePath = certificate.filePath;
      
      // If path is relative (starts with /public or /uploads), make it absolute
      if (filePath.startsWith('/public/')) {
        filePath = path.join(process.cwd(), filePath);
      } else if (filePath.startsWith('/uploads/')) {
        filePath = path.join(process.cwd(), 'public', filePath);
      } else if (!path.isAbsolute(filePath)) {
        filePath = path.join(process.cwd(), 'public', filePath);
      }

      // Check if file exists
      try {
        await fs.access(filePath);
        fileBuffer = await fs.readFile(filePath);
      } catch (error) {
        console.error('Physical file not found, generating on-demand:', filePath);
        // File missing, fall back to on-demand generation
        fileBuffer = await PDFGeneratorService.generateCertificatePDF(certificateId);
      }
    } else {
      // On-demand mode: No physical file, generate in-memory
      console.log('Generating certificate on-demand for ID:', certificateId);
      fileBuffer = await PDFGeneratorService.generateCertificatePDF(certificateId);
    }

    // Generate a clean filename
    const templateName = certificate.template?.templateName || 'Certificate'
    const cleanTemplateName = templateName.replace(/[^a-z0-9]/gi, '_')
    const fileName = `${cleanTemplateName}_${certificate.uniqueCode}.pdf`

    // Check if this is for viewing (inline) or downloading (attachment)
    const searchParams = request.nextUrl.searchParams
    const isView = searchParams.get('view') === 'true'
    const disposition = isView ? 'inline' : 'attachment'

    // Return the file with proper headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Certificate download error:', error)
    return NextResponse.json(
      { error: 'Failed to download certificate', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
