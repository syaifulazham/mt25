import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Allowed roles
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR'];

export async function PUT(
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
    const { nextQuizId } = body;

    // Validate nextQuizId if provided
    if (nextQuizId !== null && nextQuizId !== undefined) {
      if (typeof nextQuizId !== 'number' || isNaN(nextQuizId)) {
        return NextResponse.json(
          { error: 'Invalid next quiz ID' },
          { status: 400 }
        );
      }

      // Check if the next quiz exists
      const nextQuiz = await prisma.quiz.findUnique({
        where: { id: nextQuizId }
      });

      if (!nextQuiz) {
        return NextResponse.json(
          { error: 'Next quiz not found' },
          { status: 404 }
        );
      }

      // Prevent setting progression to ended, retracted, or published quizzes
      if (nextQuiz.status === 'ended' || nextQuiz.status === 'retracted' || nextQuiz.status === 'published') {
        return NextResponse.json(
          { error: 'Cannot set progression to ended, retracted, or published quiz' },
          { status: 400 }
        );
      }

      // Prevent circular reference (quiz pointing to itself)
      if (nextQuizId === quizId) {
        return NextResponse.json(
          { error: 'Cannot set quiz progression to itself' },
          { status: 400 }
        );
      }
    }

    // Check if quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Update the quiz progression
    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        nextQuizId: nextQuizId === null ? null : nextQuizId
      }
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: updatedQuiz.id,
        quiz_name: updatedQuiz.quiz_name,
        nextQuizId: updatedQuiz.nextQuizId
      }
    });

  } catch (error) {
    console.error('Error updating quiz progression:', error);
    return NextResponse.json(
      { error: 'Failed to update quiz progression' },
      { status: 500 }
    );
  }
}
