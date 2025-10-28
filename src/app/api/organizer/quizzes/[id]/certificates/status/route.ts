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
    const { contestantIds } = body;

    if (!Array.isArray(contestantIds) || contestantIds.length === 0) {
      return NextResponse.json(
        { error: 'contestantIds array is required' },
        { status: 400 }
      );
    }

    // Get template for this quiz
    const template = await prisma.certTemplate.findFirst({
      where: {
        quizId,
        targetType: 'QUIZ_PARTICIPANT',
        status: 'ACTIVE'
      }
    });

    if (!template) {
      // No template, return empty statuses
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
    `;

    // Build status map
    const statuses: Record<number, boolean> = {};
    
    certificates.forEach((cert) => {
      if (cert.contestantId && contestantIds.includes(cert.contestantId)) {
        statuses[cert.contestantId] = true;
      }
    });

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
