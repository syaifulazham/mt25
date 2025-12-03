import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import { PDFGeneratorService } from '@/lib/services/pdf-generator-service'

// Allowed roles for certificate access (organizers)
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER']

/**
 * GET /api/certificates/[id]/download
 * Download certificate PDF
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }
    
    // Check if user is authorized (either organizer with role OR participant)
    const isOrganizer = session.user.role && ALLOWED_ROLES.includes(session.user.role)
    
    // Check if user is a participant
    let isParticipant = false
    if (!isOrganizer && session.user.email) {
      const participant = await prisma.user_participant.findUnique({
        where: { email: session.user.email }
      })
      isParticipant = !!participant
    }
    
    // User must be either organizer or participant
    if (!isOrganizer && !isParticipant) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    const certificateId = parseInt(params.id)

    if (isNaN(certificateId)) {
      return NextResponse.json(
        { error: 'Invalid certificate ID' },
        { status: 400 }
      )
    }

    // Fetch certificate
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      select: {
        id: true,
        filePath: true,
        recipientName: true,
        status: true,
        uniqueCode: true
      }
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    let fileBuffer: Buffer

    // Check if physical file exists or generate on-demand
    if (certificate.filePath) {
      // Legacy mode: Physical file exists, try to read from disk
      console.log('Attempting to use physical file:', certificate.filePath)
      
      const filePath = path.join(process.cwd(), 'public', certificate.filePath)

      // Check if file exists
      if (fs.existsSync(filePath)) {
        console.log('Reading physical file from disk')
        fileBuffer = fs.readFileSync(filePath)
      } else {
        // File missing, fall back to on-demand generation
        console.log('Physical file not found, generating on-demand')
        fileBuffer = Buffer.from(await PDFGeneratorService.generateCertificatePDF(certificateId))
      }
    } else {
      // On-demand mode: No physical file, generate in-memory
      console.log('Generating certificate on-demand for ID:', certificateId)
      fileBuffer = Buffer.from(await PDFGeneratorService.generateCertificatePDF(certificateId))
    }

    // Create safe filename
    const sanitizedName = certificate.recipientName.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `Certificate_${sanitizedName}_${certificate.uniqueCode}.pdf`

    // Return PDF with attachment disposition (force download)
    // Use no-cache to ensure regenerated certificates are immediately available
    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })

  } catch (error) {
    console.error('Error downloading certificate:', error)
    return NextResponse.json(
      { 
        error: 'Failed to download certificate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
