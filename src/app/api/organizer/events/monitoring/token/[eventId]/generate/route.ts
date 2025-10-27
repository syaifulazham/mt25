import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { eventId } = params;
  const { count = 10 } = await req.json();
  const prisma = new PrismaClient();

  try {
    const tokens = [];
    
    for (let i = 0; i < count; i++) {
      const token = Math.random().toString(36).substring(2, 10).toUpperCase();
      const createdToken = await prisma.eventcontesttoken.create({
        data: {
          eventId: parseInt(eventId),
          eventToken: token,
          consumed: false
        }
      });
      tokens.push(createdToken);
    }

    return NextResponse.json(tokens);
  } catch (error) {
    console.error('Error generating tokens:', error);
    return NextResponse.json(
      { error: 'Failed to generate tokens' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
