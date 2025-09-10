import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/lib/session';
import { checkQuizAuthorization } from '../../auth-utils';

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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    const authCheck = await checkQuizAuthorization(user);
    
    if (!authCheck.authorized) {
      return authCheck.response;
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
                logoUrl: true,
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
      // No sorting here - we'll sort after getting answers
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
    const attemptsWithSummary = attemptsWithAnswers.map((attempt) => {
      const totalQuestions = attempt.quiz_answer.length;
      const correctAnswers = attempt.quiz_answer.filter(answer => answer.is_correct).length;
      const percentage = totalQuestions > 0 
        ? Math.round((correctAnswers / totalQuestions) * 100) 
        : 0;
      
      return {
        attemptId: attempt.id,
        contestantId: attempt.contestantId,
        contestantName: attempt.contestant.name,
        contestantHash: attempt.contestant.hashcode,
        contingentName: attempt.contestant.contingent?.name || 'N/A',
        institutionName: getInstitutionName(attempt.contestant.contingent),
        contingentLogoUrl: attempt.contestant.contingent?.logoUrl || null,
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
    
    // Sort by correct answers (highest first) and then by time taken (fastest first) for non-zero times
    const sortedResults = [...attemptsWithSummary].sort((a, b) => {
      // First sort by number of correct answers (highest first)
      if (b.summary.correctAnswers !== a.summary.correctAnswers) {
        return b.summary.correctAnswers - a.summary.correctAnswers;
      }
      
      // Then sort by time taken (fastest first), but only consider non-zero times
      // If either value is null/undefined, treat as zero
      const aTime = a.timeTaken || 0;
      const bTime = b.timeTaken || 0;
      
      // If both have zero time, they're equal
      // If one has zero time, the non-zero time comes first
      // Otherwise, sort by fastest time
      if (aTime === 0 && bTime === 0) return 0;
      if (aTime === 0) return 1;
      if (bTime === 0) return -1;
      return aTime - bTime;
    });
    
    // Add ranking after sorting
    const resultsWithSummary = sortedResults.map((result, index) => ({
      ...result,
      rank: index + 1
    }));

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
