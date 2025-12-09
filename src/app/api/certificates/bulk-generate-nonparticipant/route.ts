import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import { prisma } from '@/lib/prisma'
import { CertificateSerialService } from '@/lib/services/certificate-serial-service'

// Allowed roles
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }
    
    const userId = parseInt(session.user.id)
    
    // Parse request body
    const body = await request.json()
    const { templateId, certificates } = body
    
    // Validate inputs
    if (!templateId || typeof templateId !== 'number') {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }
    
    if (!certificates || !Array.isArray(certificates) || certificates.length === 0) {
      return NextResponse.json(
        { error: 'Certificates array is required and must not be empty' },
        { status: 400 }
      )
    }
    
    // Validate template exists and is NON_CONTEST_PARTICIPANT type
    const template = await prisma.certTemplate.findUnique({
      where: { id: templateId }
    })
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }
    
    if (template.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Template is not active' },
        { status: 400 }
      )
    }
    
    if (template.targetType !== 'NON_CONTEST_PARTICIPANT') {
      return NextResponse.json(
        { error: 'Template must be of type NON_CONTEST_PARTICIPANT' },
        { status: 400 }
      )
    }
    
    // Process each certificate
    const createdCertificates = []
    const errors = []
    
    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i]
      
      try {
        // Validate required fields
        if (!cert.recipientName || cert.recipientName.trim() === '') {
          errors.push({ row: i + 1, error: 'Recipient name is required' })
          continue
        }
        
        // Generate unique code
        const uniqueCode = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        
        // Generate serial number
        const serialNumber = await CertificateSerialService.generateSerialNumber(
          template.id,
          'NON_CONTEST_PARTICIPANT'
        )
        
        // Helper function to safely convert to string and trim
        const toStringOrNull = (value: any): string | null => {
          if (value === null || value === undefined || value === '') return null
          return String(value).trim()
        }
        
        // Create certificate record with status LISTED (no PDF yet)
        const certificate = await prisma.certificate.create({
          data: {
            templateId: template.id,
            recipientName: String(cert.recipientName).trim(),
            recipientEmail: toStringOrNull(cert.recipientEmail),
            recipientType: 'PARTICIPANT',
            contingent_name: toStringOrNull(cert.contingentName),
            ic_number: toStringOrNull(cert.icNumber),
            team_name: toStringOrNull(cert.teamName),
            awardTitle: toStringOrNull(cert.awardTitle),
            uniqueCode,
            serialNumber,
            filePath: null, // No PDF generated yet
            status: 'LISTED', // Status is LISTED, not READY
            createdBy: userId,
          }
        })
        
        createdCertificates.push(certificate)
        
      } catch (error) {
        console.error(`Error processing certificate at row ${i + 1}:`, error)
        errors.push({ 
          row: i + 1, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }
    
    // Return results
    return NextResponse.json({
      success: true,
      created: createdCertificates.length,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined,
      message: `Successfully created ${createdCertificates.length} certificate record${createdCertificates.length !== 1 ? 's' : ''}${errors.length > 0 ? `. ${errors.length} error(s) occurred.` : ''}`
    }, { status: 201 })
    
  } catch (error) {
    console.error('Bulk certificate generation error:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk certificate generation' },
      { status: 500 }
    )
  }
}
