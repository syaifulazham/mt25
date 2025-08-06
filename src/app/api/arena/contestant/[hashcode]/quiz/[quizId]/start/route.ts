import { NextRequest, NextResponse } from 'next/server';
import { prismaExecute } from '@/lib/prisma';

export async function POST(
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

    // Get quiz details and questions
    const quizzes = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT 
          q.id,
          q.quiz_name,
          q.description,
          q.target_group,
          q.time_limit,
          q.status,
          q.publishedAt
        FROM quiz q
        WHERE q.id = ${quizIdNum}
      `
    ) as any[];

    if (quizzes.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Quiz not found' },
        { status: 404 }
      );
    }

    const quiz = quizzes[0];

    // Check if quiz is published
    if (quiz.status !== 'published') {
      return NextResponse.json(
        { success: false, message: 'Quiz is not available' },
        { status: 403 }
      );
    }

    // Verify contestant is eligible for this quiz based on age and target group
    const contestantAge = Number(contestant.age) || 0;
    const eduLevel = contestant.edu_level?.toLowerCase() || '';
    
    // Determine school level from edu_level
    const getSchoolLevel = (eduLevel: string) => {
      if (eduLevel.includes('rendah') || eduLevel.includes('primary')) {
        return 'Primary';
      } else if (eduLevel.includes('menengah') || eduLevel.includes('secondary')) {
        return 'Secondary';
      } else if (eduLevel.includes('universiti') || eduLevel.includes('university') || eduLevel.includes('college')) {
        return 'Higher Education';
      } else {
        return 'Primary'; // Default fallback
      }
    };

    const schoolLevel = getSchoolLevel(eduLevel);

    // Check if contestant is eligible for this quiz's target group
    const eligibleTargetGroups = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT code FROM targetgroup 
        WHERE code = ${quiz.target_group}
        AND minAge <= ${contestantAge} 
        AND maxAge >= ${contestantAge}
        AND (schoolLevel = ${schoolLevel} OR code = 'OA')
      `
    ) as any[];

    if (eligibleTargetGroups.length === 0) {
      return NextResponse.json(
        { success: false, message: 'You are not eligible for this quiz' },
        { status: 403 }
      );
    }

    // Check if contestant has already started this quiz
    const existingAttempts = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT id, status, score, start_time, end_time, time_taken FROM quiz_attempt 
        WHERE contestantId = ${contestantId} AND quizId = ${quizIdNum}
        ORDER BY createdAt DESC
        LIMIT 1
      `
    ) as any[];

    // If there's an existing attempt
    if (existingAttempts.length > 0) {
      const existingAttempt = existingAttempts[0];
      
      // If the attempt is completed, prevent retake
      if (existingAttempt.status === 'completed') {
        return NextResponse.json({
          success: false,
          message: 'Quiz already completed',
          isCompleted: true,
          attemptId: Number(existingAttempt.id),
          score: Number(existingAttempt.score) || 0,
          timeTaken: Number(existingAttempt.time_taken) || 0,
          startTime: existingAttempt.start_time,
          endTime: existingAttempt.end_time
        }, { status: 409 }); // 409 Conflict - quiz already completed
      }
      
      // If there's an existing attempt that's still in progress, return it
      if (existingAttempt.status === 'in_progress') {
        return NextResponse.json({
          success: true,
          message: 'Quiz attempt already in progress',
          attemptId: Number(existingAttempt.id),
          isNewAttempt: false
        });
      }
    }

    // Create new quiz attempt
    const currentTime = new Date();
    const attemptResults = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        INSERT INTO quiz_attempt (quizId, contestantId, status, start_time, createdAt, updatedAt)
        VALUES (${quizIdNum}, ${contestantId}, 'in_progress', ${currentTime}, ${currentTime}, ${currentTime})
      `
    ) as any;

    // Get the created attempt ID
    const newAttempts = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT id FROM quiz_attempt 
        WHERE contestantId = ${contestantId} AND quizId = ${quizIdNum}
        ORDER BY createdAt DESC
        LIMIT 1
      `
    ) as any[];

    if (newAttempts.length === 0) {
      throw new Error('Failed to create quiz attempt');
    }

    const attemptId = Number(newAttempts[0].id);

    // Get quiz questions to create initial answer records
    const questions = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT 
          qb.id,
          qq.order,
          qq.points
        FROM quiz_question qq
        JOIN question_bank qb ON qq.questionId = qb.id
        WHERE qq.quizId = ${quizIdNum}
        ORDER BY qq.order ASC
      `
    ) as any[];

    // Create initial quiz_answer records for all questions (empty answers)
    for (const question of questions) {
      await prismaExecute(async (prisma) => 
        prisma.$queryRaw`
          INSERT INTO quiz_answer (attemptId, questionId, selected_options, is_correct, points_earned, createdAt)
          VALUES (${attemptId}, ${Number(question.id)}, '[]', false, 0, ${currentTime})
        `
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Quiz attempt started successfully',
      attemptId: attemptId,
      isNewAttempt: true,
      startTime: currentTime.toISOString(),
      questionsCount: questions.length
    });

  } catch (error) {
    console.error('Arena quiz start error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
