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

    // Get quiz details
    const quizzes = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT 
          q.id,
          q.quiz_name,
          q.description,
          q.target_group,
          q.time_limit,
          q.status,
          q.publishedAt,
          COUNT(qq.questionId) as totalQuestions
        FROM quiz q
        LEFT JOIN quiz_question qq ON q.id = qq.quizId
        WHERE q.id = ${quizIdNum}
        GROUP BY q.id, q.quiz_name, q.description, q.target_group, q.time_limit, q.status, q.publishedAt
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

    // Get quiz questions with their details
    const questions = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT 
          qb.id,
          qb.question,
          qb.question_image,
          qb.answer_type,
          qb.answer_options,
          qb.answer_correct,
          qb.knowledge_field,
          qb.target_group,
          qq.order,
          qq.points
        FROM quiz_question qq
        JOIN question_bank qb ON qq.questionId = qb.id
        WHERE qq.quizId = ${quizIdNum}
        ORDER BY qq.order ASC
      `
    ) as any[];

    const responseData = {
      success: true,
      quiz: {
        id: Number(quiz.id),
        quiz_name: quiz.quiz_name || '',
        description: quiz.description || '',
        target_group: quiz.target_group || '',
        time_limit: Number(quiz.time_limit) || 60,
        status: quiz.status || '',
        totalQuestions: Number(quiz.totalQuestions) || 0,
        publishedAt: quiz.publishedAt
      },
      questions: questions.map((q: any) => ({
        id: Number(q.id),
        question: q.question || '',
        question_image: q.question_image || null,
        answer_type: q.answer_type || 'single_selection',
        answer_options: q.answer_options || [],
        answer_correct: q.answer_correct || '',
        knowledge_field: q.knowledge_field || '',
        target_group: q.target_group || '',
        order: Number(q.order) || 0,
        points: Number(q.points) || 1
      }))
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Arena quiz data error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
