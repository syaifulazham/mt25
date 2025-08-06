import { NextRequest, NextResponse } from 'next/server';
import { prismaExecute } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { hashcode: string; quizId: string } }
) {
  try {
    const { hashcode, quizId } = params;

    if (!hashcode || !quizId) {
      return NextResponse.json(
        { success: false, message: 'Hashcode and quiz ID are required' },
        { status: 400 }
      );
    }

    const quizIdNum = parseInt(quizId);
    if (isNaN(quizIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid quiz ID' },
        { status: 400 }
      );
    }

    // First, verify the contestant exists and is active
    const contestants = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT 
          c.id,
          c.name,
          c.age,
          c.edu_level,
          c.contingentId
        FROM contestant c
        WHERE c.hashcode = ${hashcode} AND c.status = 'ACTIVE'
        LIMIT 1
      `
    ) as any[];

    if (contestants.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Contestant not found or inactive' },
        { status: 404 }
      );
    }

    const contestant = contestants[0];
    const contestantId = Number(contestant.id);

    // Get the completed quiz attempt
    const attempts = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT 
          qa.id,
          qa.status,
          qa.score,
          qa.start_time,
          qa.end_time,
          qa.time_taken,
          qa.createdAt,
          q.quiz_name,
          q.description,
          q.target_group,
          q.time_limit
        FROM quiz_attempt qa
        JOIN quiz q ON qa.quizId = q.id
        WHERE qa.contestantId = ${contestantId} 
        AND qa.quizId = ${quizIdNum}
        AND qa.status = 'completed'
        ORDER BY qa.createdAt DESC
        LIMIT 1
      `
    ) as any[];

    if (attempts.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No completed quiz attempt found' },
        { status: 404 }
      );
    }

    const attempt = attempts[0];
    const attemptId = Number(attempt.id);

    // Get all quiz answers for this attempt
    const answers = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT 
          qa.questionId,
          qa.selected_options,
          qa.is_correct,
          qa.points_earned,
          qb.question,
          qb.question_image,
          qb.answer_type,
          qb.answer_options,
          qb.answer_correct,
          qb.knowledge_field,
          qq.order,
          qq.points as max_points
        FROM quiz_answer qa
        JOIN question_bank qb ON qa.questionId = qb.id
        JOIN quiz_question qq ON qa.questionId = qq.questionId AND qq.quizId = ${quizIdNum}
        WHERE qa.attemptId = ${attemptId}
        ORDER BY qq.order ASC
      `
    ) as any[];

    // Calculate summary statistics
    const totalQuestions = answers.length;
    const correctAnswers = answers.filter((a: any) => a.is_correct).length;
    const totalScore = Number(attempt.score) || 0;
    const maxPossibleScore = answers.reduce((sum: number, a: any) => sum + (Number(a.max_points) || 0), 0);
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Format the response
    const responseData = {
      success: true,
      attempt: {
        id: attemptId,
        status: attempt.status,
        score: totalScore,
        maxScore: maxPossibleScore,
        startTime: attempt.start_time,
        endTime: attempt.end_time,
        timeTaken: Number(attempt.time_taken) || 0,
        createdAt: attempt.createdAt
      },
      quiz: {
        id: quizIdNum,
        quiz_name: attempt.quiz_name || '',
        description: attempt.description || '',
        target_group: attempt.target_group || '',
        time_limit: Number(attempt.time_limit) || 60,
        totalQuestions: totalQuestions
      },
      summary: {
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        incorrectAnswers: totalQuestions - correctAnswers,
        percentage: percentage,
        totalScore: totalScore,
        maxPossibleScore: maxPossibleScore
      },
      answers: answers.map((answer: any) => ({
        questionId: Number(answer.questionId),
        question: answer.question || '',
        question_image: answer.question_image || null,
        answer_type: answer.answer_type || 'single_selection',
        answer_options: answer.answer_options || [],
        answer_correct: answer.answer_correct || '',
        knowledge_field: answer.knowledge_field || '',
        order: Number(answer.order) || 0,
        maxPoints: Number(answer.max_points) || 1,
        selectedOptions: answer.selected_options || [],
        isCorrect: Boolean(answer.is_correct),
        pointsEarned: Number(answer.points_earned) || 0
      }))
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Arena quiz results error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
