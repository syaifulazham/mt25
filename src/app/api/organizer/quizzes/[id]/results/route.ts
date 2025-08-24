import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// Helper function to get institution name from contingent
const getInstitutionName = (contingent: any): string => {
  if (!contingent) return 'N/A';
  
  if (contingent.school?.name) {
    return contingent.school.name;
  }
  
  if (contingent.higherInstitution?.name) {
    return contingent.higherInstitution.name;
  }
  
  if (contingent.independent?.name) {
    return contingent.independent.institution || contingent.independent.name;
  }
  
  return 'N/A';
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quizId = parseInt(params.id);
    if (isNaN(quizId)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
    }

    // First get the quiz details to make sure it exists and is published
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        quiz_name: true,
        target_group: true,
        time_limit: true,
        status: true,
        publishedAt: true,
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (quiz.status !== 'published') {
      return NextResponse.json({ error: 'Quiz is not published' }, { status: 400 });
    }

    // Get all attempts for this quiz with contestant information
    const attempts = await prisma.quiz_attempt.findMany({
      where: { quizId },
      include: {
        contestant: {
          select: {
            id: true,
            name: true,
            ic: true,
            hashcode: true,
            email: true,
            gender: true,
            age: true,
            edu_level: true,
            contingent: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    name: true
                  }
                },
                higherInstitution: {
                  select: {
                    name: true
                  }
                },
                independent: {
                  select: {
                    name: true,
                    institution: true
                  }
                }
              }
            }
          }
        },
      },
      orderBy: {
        score: 'desc', // Order by score descending (highest first)
      }
    });
    
    // Get quiz answers separately
    const attemptsWithAnswers = await Promise.all(
      attempts.map(async (attempt) => {
        const answers = await prisma.quiz_answer.findMany({
          where: { attemptId: attempt.id },
          select: {
            id: true,
            questionId: true,
            selected_options: true,
            is_correct: true,
            points_earned: true,
          }
        });
        return {
          ...attempt,
          quiz_answer: answers
        };
      })
    );

    // Calculate summary for each attempt
    const resultsWithSummary = attemptsWithAnswers.map((attempt, index) => {
      const totalQuestions = attempt.quiz_answer.length;
      const correctAnswers = attempt.quiz_answer.filter(answer => answer.is_correct).length;
      const percentage = totalQuestions > 0 
        ? Math.round((correctAnswers / totalQuestions) * 100) 
        : 0;
      
      return {
        rank: index + 1, // Add ranking based on ordered results
        attemptId: attempt.id,
        contestantId: attempt.contestantId,
        contestantName: attempt.contestant.name,
        contestantHash: attempt.contestant.hashcode,
        contingentName: attempt.contestant.contingent?.name || 'N/A',
        institutionName: getInstitutionName(attempt.contestant.contingent),
        startTime: attempt.start_time,
        endTime: attempt.end_time,
        timeTaken: attempt.time_taken,
        score: attempt.score,
        summary: {
          totalQuestions,
          correctAnswers,
          percentage
        }
      };
    });

    return NextResponse.json({ 
      quiz,
      results: resultsWithSummary,
      totalAttempts: resultsWithSummary.length
    });
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz results', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
