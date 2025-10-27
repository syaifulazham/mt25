import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/participants/contestants/[id]/certificate
 * Get certificate for a contestant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const contestantId = parseInt(params.id);
    if (isNaN(contestantId)) {
      return NextResponse.json(
        { error: 'Invalid contestant ID' },
        { status: 400 }
      );
    }

    // Fetch contestant to get IC number
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      select: {
        id: true,
        ic: true,
        name: true,
        contingentId: true
      }
    });

    if (!contestant) {
      return NextResponse.json(
        { error: 'Contestant not found' },
        { status: 404 }
      );
    }

    // Find certificate for this contestant using IC number
    // Looking for GENERAL type certificate (participant-generated)
    const certificate = await prisma.$queryRaw`
      SELECT c.*, t.templateName, t.targetType
      FROM certificate c
      LEFT JOIN cert_template t ON c.templateId = t.id
      WHERE c.ic_number = ${contestant.ic}
        AND t.targetType = 'GENERAL'
        AND c.status IN ('READY', 'ISSUED')
      ORDER BY c.createdAt DESC
      LIMIT 1
    ` as any[];

    if (certificate.length === 0) {
      return NextResponse.json(
        { error: 'No certificate found for this contestant' },
        { status: 404 }
      );
    }

    return NextResponse.json(certificate[0]);

  } catch (error) {
    console.error('Error fetching certificate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificate' },
      { status: 500 }
    );
  }
}
