import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Allowed roles
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR'];

export async function POST(
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
    if (isNaN(quizId)) {
      return NextResponse.json(
        { error: 'Invalid quiz ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { contestantIds, certificateType } = body;

    if (!Array.isArray(contestantIds) || contestantIds.length === 0) {
      return NextResponse.json(
        { error: 'contestantIds array is required' },
        { status: 400 }
      );
    }

    // Determine target type based on certificate type
    let targetType: 'QUIZ_PARTICIPANT' | 'QUIZ_WINNER' = 'QUIZ_PARTICIPANT';
    if (certificateType === 'ACHIEVEMENT') {
      targetType = 'QUIZ_WINNER';
    }

    // Get template for this quiz
    const template = await prisma.certTemplate.findFirst({
      where: {
        quizId,
        targetType,
        status: 'ACTIVE'
      }
    });

    console.log('[Certificate Status API] QuizId:', quizId);
    console.log('[Certificate Status API] Target Type:', targetType);
    console.log('[Certificate Status API] Template found:', template?.id);
    console.log('[Certificate Status API] Requested contestant IDs:', contestantIds);

    if (!template) {
      // No template, return empty statuses
      console.log('[Certificate Status API] No template found, returning empty');
      return NextResponse.json({
        statuses: {}
      });
    }

    // Check which contestants have certificates using raw query
    const certificates = await prisma.$queryRaw<Array<{ contestantId: number }>>`
      SELECT CAST(JSON_EXTRACT(ownership, '$.contestantId') AS UNSIGNED) as contestantId
      FROM certificate
      WHERE templateId = ${template.id}
        AND JSON_EXTRACT(ownership, '$.contestantId') IS NOT NULL
        AND status = 'READY'
    `;

    console.log('[Certificate Status API] Certificates found:', certificates.length);
    console.log('[Certificate Status API] Certificate contestant IDs:', certificates.map(c => c.contestantId));

    // Build status map
    const statuses: Record<number, boolean> = {};
    
    certificates.forEach((cert) => {
      // Convert BigInt to number for comparison
      const contestantIdNum = Number(cert.contestantId);
      if (contestantIdNum && contestantIds.includes(contestantIdNum)) {
        statuses[contestantIdNum] = true;
      }
    });

    console.log('[Certificate Status API] Final statuses:', statuses);

    return NextResponse.json({
      statuses
    });

  } catch (error) {
    console.error('Error checking certificate statuses:', error);
    return NextResponse.json(
      { error: 'Failed to check certificate statuses' },
      { status: 500 }
    );
  }
}
