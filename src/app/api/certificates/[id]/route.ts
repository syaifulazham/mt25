import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { prisma } from '@/lib/prisma';

// Allowed roles for certificate access
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'];

/**
 * GET /api/certificates/[id]
 * Get a specific certificate by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const certificateId = parseInt(params.id);

    if (isNaN(certificateId)) {
      return NextResponse.json(
        { error: 'Invalid certificate ID' },
        { status: 400 }
      );
    }

    // Fetch certificate with template details
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        template: {
          select: {
            id: true,
            templateName: true,
            targetType: true,
            basePdfPath: true,
            configuration: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    // Parse configuration if it's a string
    const result = {
      ...certificate,
      template: certificate.template ? {
        ...certificate.template,
        configuration: typeof certificate.template.configuration === 'string' 
          ? JSON.parse(certificate.template.configuration as string)
          : certificate.template.configuration
      } : null
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch certificate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificate' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/certificates/[id]
 * Update certificate details (Admin & Operator)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has required role (Admin or Operator)
    if (!session?.user || !session.user.role || !['ADMIN', 'OPERATOR'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const certificateId = parseInt(params.id);

    if (isNaN(certificateId)) {
      return NextResponse.json(
        { error: 'Invalid certificate ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      recipientName,
      recipientEmail,
      recipientType,
      contingent_name,
      team_name,
      ic_number,
      contestName,
      awardTitle
    } = body;

    // Validate required fields
    if (!recipientName) {
      return NextResponse.json(
        { error: 'Recipient name is required' },
        { status: 400 }
      );
    }

    // Update the certificate
    const updatedCertificate = await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        recipientName,
        recipientEmail: recipientEmail || null,
        recipientType: recipientType || 'PARTICIPANT',
        contingent_name: contingent_name || null,
        team_name: team_name || null,
        ic_number: ic_number || null,
        contestName: contestName || null,
        awardTitle: awardTitle || null,
        updatedAt: new Date()
      },
      include: {
        template: {
          select: {
            id: true,
            templateName: true,
            targetType: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Certificate updated successfully',
      certificate: updatedCertificate
    });
  } catch (error) {
    console.error('Failed to update certificate:', error);
    return NextResponse.json(
      { error: 'Failed to update certificate' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/certificates/[id]
 * Delete a certificate (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const certificateId = parseInt(params.id);

    if (isNaN(certificateId)) {
      return NextResponse.json(
        { error: 'Invalid certificate ID' },
        { status: 400 }
      );
    }

    // Delete the certificate
    await prisma.certificate.delete({
      where: { id: certificateId }
    });

    return NextResponse.json({
      success: true,
      message: 'Certificate deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete certificate:', error);
    return NextResponse.json(
      { error: 'Failed to delete certificate' },
      { status: 500 }
    );
  }
}
