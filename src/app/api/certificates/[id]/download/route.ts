import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

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

    if (!certificate.filePath) {
      return NextResponse.json(
        { error: 'Certificate PDF not available' },
        { status: 404 }
      )
    }

    // Construct absolute file path
    const filePath = path.join(process.cwd(), 'public', certificate.filePath)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Certificate file not found on server' },
        { status: 404 }
      )
    }

    // Read the PDF file
    const fileBuffer = fs.readFileSync(filePath)

    // Create safe filename
    const sanitizedName = certificate.recipientName.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `Certificate_${sanitizedName}_${certificate.uniqueCode}.pdf`

    // Return PDF with attachment disposition (force download)
    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000',
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
