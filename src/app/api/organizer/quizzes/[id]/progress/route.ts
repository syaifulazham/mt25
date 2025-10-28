import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Allowed roles
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR'];

interface ProgressRequest {
  contestantId: number;
  nextQuizId?: number; // Optional, will use quiz.nextQuizId if not provided
}

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
    const body: ProgressRequest = await request.json();
    const { contestantId, nextQuizId: requestedNextQuizId } = body;

    // Validate inputs
    if (!contestantId) {
      return NextResponse.json(
        { error: 'Missing contestantId' },
        { status: 400 }
      );
    }

    // Validate quiz exists and get nextQuizId
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { 
        id: true, 
        quiz_name: true,
        nextQuizId: true,
        nextQuiz: {
          select: {
            id: true,
            quiz_name: true
          }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Determine which nextQuizId to use
    const nextQuizId = requestedNextQuizId || quiz.nextQuizId;

    if (!nextQuizId) {
      return NextResponse.json(
        { error: 'No next quiz configured for this quiz' },
        { status: 400 }
      );
    }

    // Validate next quiz exists
    const nextQuiz = await prisma.quiz.findUnique({
      where: { id: nextQuizId },
      select: { id: true, quiz_name: true, status: true }
    });

    if (!nextQuiz) {
      return NextResponse.json(
        { error: 'Next quiz not found' },
        { status: 404 }
      );
    }

    // Validate contestant exists
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      include: {
        contingent: {
          select: {
            id: true,
            name: true
          }
        },
        quizAttempts: {
          where: { quizId },
          select: {
            id: true,
            status: true,
            score: true
          }
        }
      }
    });

    if (!contestant) {
      return NextResponse.json(
        { error: 'Contestant not found' },
        { status: 404 }
      );
    }

    // Verify contestant completed the current quiz
    if (contestant.quizAttempts.length === 0) {
      return NextResponse.json(
        { error: 'Contestant has not attempted this quiz' },
        { status: 400 }
      );
    }

    const hasCompletedAttempt = contestant.quizAttempts.some(
      attempt => attempt.status === 'completed'
    );

    if (!hasCompletedAttempt) {
      return NextResponse.json(
        { error: 'Contestant has not completed this quiz' },
        { status: 400 }
      );
    }

    // Check if progression already exists
    const existingProgression = await prisma.quiz_progression.findFirst({
      where: {
        contestantId,
        quizId,
        nextQuizId
      }
    });

    if (existingProgression) {
      return NextResponse.json(
        { 
          error: 'Contestant has already progressed to this quiz',
          progression: existingProgression
        },
        { status: 409 }
      );
    }

    // Create progression record
    const progression = await prisma.quiz_progression.create({
      data: {
        quizId,
        nextQuizId,
        contingentId: contestant.contingent.id,
        contestantId,
        progressedAt: new Date()
      },
      include: {
        quiz: {
          select: { id: true, quiz_name: true }
        },
        nextQuiz: {
          select: { id: true, quiz_name: true }
        },
        contestant: {
          select: { id: true, name: true }
        },
        contingent: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `${contestant.name} progressed to ${nextQuiz.quiz_name}`,
      progression: {
        id: progression.id,
        quizId: progression.quizId,
        quizName: progression.quiz.quiz_name,
        nextQuizId: progression.nextQuizId,
        nextQuizName: progression.nextQuiz.quiz_name,
        contestantId: progression.contestantId,
        contestantName: progression.contestant.name,
        contingentId: progression.contingentId,
        contingentName: progression.contingent.name,
        progressedAt: progression.progressedAt
      }
    });

  } catch (error) {
    console.error('Error creating progression:', error);
    return NextResponse.json(
      { error: 'Failed to create progression' },
      { status: 500 }
    );
  }
}

// Get progressions for a quiz
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

    // Get all progressions for this quiz
    const progressions = await prisma.quiz_progression.findMany({
      where: { quizId },
      include: {
        contestant: {
          select: { id: true, name: true }
        },
        contingent: {
          select: { id: true, name: true }
        },
        nextQuiz: {
          select: { id: true, quiz_name: true }
        }
      },
      orderBy: { progressedAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      progressions: progressions.map(p => ({
        id: p.id,
        contestantId: p.contestantId,
        contestantName: p.contestant.name,
        contingentId: p.contingentId,
        contingentName: p.contingent.name,
        nextQuizId: p.nextQuizId,
        nextQuizName: p.nextQuiz.quiz_name,
        progressedAt: p.progressedAt
      })),
      total: progressions.length
    });

  } catch (error) {
    console.error('Error fetching progressions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progressions' },
      { status: 500 }
    );
  }
}
