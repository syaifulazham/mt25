import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

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

    if (!certificate.filePath) {
      return NextResponse.json(
        { error: 'Certificate file not available' },
        { status: 404 }
      )
    }

    // Resolve the file path (handle both absolute and relative paths)
    let filePath = certificate.filePath
    
    // If path is relative (starts with /public or /uploads), make it absolute
    if (filePath.startsWith('/public/')) {
      filePath = path.join(process.cwd(), filePath)
    } else if (filePath.startsWith('/uploads/')) {
      filePath = path.join(process.cwd(), 'public', filePath)
    } else if (!path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), 'public', filePath)
    }

    // Check if file exists
    try {
      await fs.access(filePath)
    } catch (error) {
      console.error('File not found:', filePath)
      return NextResponse.json(
        { error: 'Certificate file not found on server' },
        { status: 404 }
      )
    }

    // Read the file
    const fileBuffer = await fs.readFile(filePath)

    // Generate a clean filename
    const templateName = certificate.template?.templateName || 'Certificate'
    const cleanTemplateName = templateName.replace(/[^a-z0-9]/gi, '_')
    const fileName = `${cleanTemplateName}_${certificate.uniqueCode}.pdf`

    // Return the file with proper headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
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
