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

    // Validate quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        quiz_name: true,
        target_group: true,
        status: true,
        nextQuizId: true
      }
    });

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Find participant certificate template
    const participantTemplate = await prisma.certTemplate.findFirst({
      where: {
        quizId,
        targetType: 'QUIZ_PARTICIPANT',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        templateName: true,
        basePdfPath: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Find winner certificate template
    const winnerTemplate = await prisma.certTemplate.findFirst({
      where: {
        quizId,
        targetType: 'QUIZ_WINNER',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        templateName: true,
        basePdfPath: true,
        winnerRangeStart: true,
        winnerRangeEnd: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get next quiz info if configured
    let nextQuiz = null;
    if (quiz.nextQuizId) {
      nextQuiz = await prisma.quiz.findUnique({
        where: { id: quiz.nextQuizId },
        select: {
          id: true,
          quiz_name: true,
          target_group: true,
          status: true
        }
      });
    }

    // Count progressions
    const progressionCount = await prisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(*) as count
      FROM quiz_progression
      WHERE quizId = ${quizId}
    `.then(result => Number(result[0]?.count || 0)).catch(() => 0);

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        quiz_name: quiz.quiz_name,
        target_group: quiz.target_group,
        status: quiz.status,
        hasNextQuiz: !!quiz.nextQuizId
      },
      templates: {
        participant: participantTemplate ? {
          id: participantTemplate.id,
          templateName: participantTemplate.templateName,
          basePdfPath: participantTemplate.basePdfPath,
          createdAt: participantTemplate.createdAt
        } : null,
        winner: winnerTemplate ? {
          id: winnerTemplate.id,
          templateName: winnerTemplate.templateName,
          basePdfPath: winnerTemplate.basePdfPath,
          winnerRangeStart: winnerTemplate.winnerRangeStart,
          winnerRangeEnd: winnerTemplate.winnerRangeEnd,
          createdAt: winnerTemplate.createdAt
        } : null
      },
      nextQuiz: nextQuiz ? {
        id: nextQuiz.id,
        quiz_name: nextQuiz.quiz_name,
        target_group: nextQuiz.target_group,
        status: nextQuiz.status
      } : null,
      stats: {
        progressionCount
      }
    });

  } catch (error) {
    console.error('Error fetching quiz templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz templates' },
      { status: 500 }
    );
  }
}
