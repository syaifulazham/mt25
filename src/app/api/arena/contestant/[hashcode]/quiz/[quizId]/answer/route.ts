import { NextRequest, NextResponse } from 'next/server';
import { prismaExecute } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { hashcode: string; quizId: string } }
) {
  try {
    const { hashcode, quizId } = params;
    const body = await request.json();
    const { attemptId, questionId, selectedOptions, isCorrect, pointsEarned } = body;

    if (!hashcode || !quizId || !attemptId || !questionId) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const quizIdNum = parseInt(quizId);
    const attemptIdNum = parseInt(attemptId);
    const questionIdNum = parseInt(questionId);

    if (isNaN(quizIdNum) || isNaN(attemptIdNum) || isNaN(questionIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid ID parameters' },
        { status: 400 }
      );
    }

    // Verify the contestant exists and owns this attempt
    const contestants = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT c.id
        FROM contestant c
        JOIN quiz_attempt qa ON c.id = qa.contestantId
        WHERE c.hashcode = ${hashcode} 
        AND qa.id = ${attemptIdNum}
        AND qa.quizId = ${quizIdNum}
        AND qa.status = 'in_progress'
        LIMIT 1
      `
    ) as any[];

    if (contestants.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid attempt or contestant not authorized' },
        { status: 403 }
      );
    }

    // Update the quiz answer
    const selectedOptionsJson = JSON.stringify(selectedOptions || []);
    const currentTime = new Date();

    await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        UPDATE quiz_answer 
        SET selected_options = ${selectedOptionsJson},
            is_correct = ${isCorrect || false},
            points_earned = ${pointsEarned || 0},
            updatedAt = ${currentTime}
        WHERE attemptId = ${attemptIdNum} 
        AND questionId = ${questionIdNum}
      `
    );

    return NextResponse.json({
      success: true,
      message: 'Answer updated successfully'
    });

  } catch (error) {
    console.error('Arena quiz answer update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { hashcode: string; quizId: string } }
) {
  try {
    const { hashcode, quizId } = params;
    const body = await request.json();
    const { attemptId, answers } = body;

    if (!hashcode || !quizId || !attemptId || !answers) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const quizIdNum = parseInt(quizId);
    const attemptIdNum = parseInt(attemptId);

    if (isNaN(quizIdNum) || isNaN(attemptIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid ID parameters' },
        { status: 400 }
      );
    }

    // Verify the contestant exists and owns this attempt
    const contestants = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT c.id
        FROM contestant c
        JOIN quiz_attempt qa ON c.id = qa.contestantId
        WHERE c.hashcode = ${hashcode} 
        AND qa.id = ${attemptIdNum}
        AND qa.quizId = ${quizIdNum}
        AND qa.status = 'in_progress'
        LIMIT 1
      `
    ) as any[];

    if (contestants.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid attempt or contestant not authorized' },
        { status: 403 }
      );
    }

    // Get quiz questions with correct answers for validation
    const questions = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT 
          qb.id,
          qb.answer_type,
          qb.answer_correct,
          qq.points
        FROM quiz_question qq
        JOIN question_bank qb ON qq.questionId = qb.id
        WHERE qq.quizId = ${quizIdNum}
      `
    ) as any[];

    const questionMap = new Map();
    questions.forEach((q: any) => {
      questionMap.set(Number(q.id), {
        answer_type: q.answer_type,
        answer_correct: q.answer_correct,
        points: Number(q.points)
      });
    });

    const currentTime = new Date();
    let totalScore = 0;

    // Update all answers in batch
    for (const [questionIdStr, selectedOptions] of Object.entries(answers)) {
      const questionId = parseInt(questionIdStr);
      const questionData = questionMap.get(questionId);
      
      if (!questionData) continue;

      // Calculate if answer is correct and points earned
      let isCorrect = false;
      let pointsEarned = 0;

      if (questionData.answer_type === 'multiple_selection') {
        const userAnswerArray = Array.isArray(selectedOptions) ? selectedOptions : [];
        const correctAnswerArray = questionData.answer_correct.split(',');
        
        if (userAnswerArray.length === correctAnswerArray.length &&
            userAnswerArray.every((ans: string) => correctAnswerArray.includes(ans))) {
          isCorrect = true;
          pointsEarned = questionData.points;
        }
      } else {
        if (selectedOptions === questionData.answer_correct) {
          isCorrect = true;
          pointsEarned = questionData.points;
        }
      }

      totalScore += pointsEarned;

      // Update the answer
      const selectedOptionsJson = JSON.stringify(Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions]);

      await prismaExecute(async (prisma) => 
        prisma.$queryRaw`
          UPDATE quiz_answer 
          SET selected_options = ${selectedOptionsJson},
              is_correct = ${isCorrect},
              points_earned = ${pointsEarned}
          WHERE attemptId = ${attemptIdNum} 
          AND questionId = ${questionId}
        `
      );
    }

    // Get the quiz attempt start time to calculate time taken
    const attemptData = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT start_time FROM quiz_attempt 
        WHERE id = ${attemptIdNum}
        LIMIT 1
      `
    ) as any[];

    if (attemptData.length === 0) {
      throw new Error('Quiz attempt not found');
    }

    const startTime = new Date(attemptData[0].start_time);
    const timeTakenSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);

    // Update the quiz attempt with final score, end time, and time taken
    await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        UPDATE quiz_attempt 
        SET score = ${totalScore},
            end_time = ${currentTime},
            time_taken = ${timeTakenSeconds},
            status = 'completed',
            updatedAt = ${currentTime}
        WHERE id = ${attemptIdNum}
      `
    );

    return NextResponse.json({
      success: true,
      message: 'Quiz completed successfully',
      totalScore: totalScore,
      attemptId: attemptIdNum
    });

  } catch (error) {
    console.error('Arena quiz completion error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
