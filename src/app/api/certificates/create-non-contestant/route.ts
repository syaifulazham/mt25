import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { PrismaClient } from '@prisma/client';
import { CertificateSerialService } from '@/lib/services/certificate-serial-service';

const prisma = new PrismaClient();

// Allowed roles for certificate creation
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR'];

/**
 * POST /api/certificates/create-non-contestant
 * Create a certificate for a non-contestant participant
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has required role
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      templateId,
      recipientName,
      recipientEmail,
      contingent_name,
      role,
      awardTitle
    } = body;

    // Validate required fields
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    if (!recipientName || !recipientName.trim()) {
      return NextResponse.json(
        { error: 'Recipient name is required' },
        { status: 400 }
      );
    }

    // Verify template exists and is NON_CONTEST_PARTICIPANT type
    const template = await prisma.certTemplate.findUnique({
      where: { id: parseInt(templateId) }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (template.targetType !== 'NON_CONTEST_PARTICIPANT') {
      return NextResponse.json(
        { error: 'Template must be of type NON_CONTEST_PARTICIPANT' },
        { status: 400 }
      );
    }

    // Generate unique code
    const uniqueCode = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Generate serial number
    const serialNumber = await CertificateSerialService.generateSerialNumber(
      parseInt(templateId),
      'NON_CONTEST_PARTICIPANT',
      new Date().getFullYear()
    );

    // Get user ID from session
    const userId = parseInt(session.user.id);

    // Create certificate
    await prisma.$executeRaw`
      INSERT INTO certificate 
      (templateId, recipientName, recipientEmail, recipientType, 
       contingent_name, team_name, ic_number, contestName, awardTitle,
       uniqueCode, serialNumber, status, createdAt, updatedAt, createdBy)
      VALUES (
        ${parseInt(templateId)},
        ${recipientName.trim()},
        ${recipientEmail || null},
        'PARTICIPANT',
        ${contingent_name || null},
        ${role || null},
        NULL,
        NULL,
        ${awardTitle || null},
        ${uniqueCode},
        ${serialNumber},
        'DRAFT',
        NOW(),
        NOW(),
        ${userId}
      )
    `;

    // Get the created certificate
    const certificate = await prisma.$queryRaw`
      SELECT * FROM certificate 
      WHERE uniqueCode = ${uniqueCode}
      LIMIT 1
    ` as any[];

    return NextResponse.json({
      success: true,
      certificate: certificate[0],
      serialNumber: serialNumber,
      message: 'Certificate created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating non-contestant certificate:', error);
    return NextResponse.json(
      { error: 'Failed to create certificate' },
      { status: 500 }
    );
  }
}
