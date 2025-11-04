import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch only ended quizzes
    const quizzes = await prisma.quiz.findMany({
      where: {
        status: 'ended'
      },
      select: {
        id: true,
        quiz_name: true,
        description: true,
        target_group: true,
        contestId: true,
        status: true,
        contest: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: {
        quiz_name: 'asc'
      }
    });

    return NextResponse.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}
