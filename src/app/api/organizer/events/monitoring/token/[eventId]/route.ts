import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { eventId } = params;
  const prisma = new PrismaClient();

  try {
    // Use Prisma client with dynamic access to work around TypeScript issues
    const tokens = await prisma.$queryRaw`
      SELECT id, eventId, eventToken, consumed, emailedTo, notes, createdAt, updatedAt 
      FROM eventcontesttoken
      WHERE eventId = ${parseInt(eventId)}
      ORDER BY createdAt DESC
    `;

    return NextResponse.json(tokens);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
