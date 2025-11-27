import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Allowed roles
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR'];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const quizId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const contestantId = searchParams.get('contestantId');

    // Validate inputs
    if (!contestantId) {
      return NextResponse.json(
        { error: 'Missing contestant ID' },
        { status: 400 }
      );
    }

    // Fetch certificate for this contestant and quiz
    const certificate = await prisma.certificate.findFirst({
      where: {
        ownership: {
          path: '$.contestantId',
          equals: parseInt(contestantId)
        },
        template: {
          quizId: quizId
        },
        status: 'READY'
      },
      include: {
        template: {
          select: {
            id: true,
            templateName: true,
            targetType: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        templateId: certificate.templateId,
        templateName: certificate.template?.templateName,
        recipientName: certificate.recipientName,
        recipientType: certificate.recipientType,
        contingent_name: certificate.contingent_name,
        uniqueCode: certificate.uniqueCode,
        serialNumber: certificate.serialNumber,
        awardTitle: certificate.awardTitle,
        filePath: certificate.filePath,
        status: certificate.status,
        issuedAt: certificate.issuedAt,
        createdAt: certificate.createdAt
      }
    });

  } catch (error) {
    console.error('Error fetching certificate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificate' },
      { status: 500 }
    );
  }
}
