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
      } else if (eduLevel.includes('universiti') || eduLevel.includes('university') || eduLevel.includes('college') || eduLevel.includes('belia')) {
        return 'Higher Education';
      } else {
        return 'Primary'; // Default fallback
      }
    };

    const schoolLevel = getSchoolLevel(eduLevel);

    // Check if contestant is eligible for this quiz's target group
    const eligibleTargetGroups = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT 
          code, 
          contestant_class_grade,
          schoolLevel,
          class_grade_array,
          minAge,
          maxAge
        FROM targetgroup 
        WHERE code = ${quiz.target_group}
        AND (
          -- If contestant_class_grade is specified, ignore age restrictions
          (contestant_class_grade IS NOT NULL AND contestant_class_grade != '' AND contestant_class_grade != 'none') OR
          -- Include target groups with class_grade_array for further filtering
          (class_grade_array IS NOT NULL) OR
          -- Otherwise apply age restrictions
          (minAge <= ${contestantAge} AND maxAge >= ${contestantAge})
        )
      `
    ) as any[];

    // Get contestant's class grade
    const contestantClassGrade = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT class_grade FROM contestant 
        WHERE id = ${contestant.id}
        LIMIT 1
      `
    ) as any[];
    
    const contestantGrade = contestantClassGrade.length > 0 ? contestantClassGrade[0].class_grade : null;
    
    // Filter target groups with the enhanced rules
    const filteredTargetGroups = eligibleTargetGroups.filter(tg => {
      console.log(`Checking eligibility for target group ${tg.code} with contestant grade ${contestantGrade}`);
      
      // Original condition: exact match on contestant_class_grade
      const originalCondition = tg.contestant_class_grade && 
                              tg.contestant_class_grade !== 'none' && 
                              tg.contestant_class_grade === contestantGrade;
      
      // New condition: class_grade_array contains contestant's class grade based on education level
      let classGradeArrayCondition = false;
      
      if (contestantGrade && tg.class_grade_array) {
        let classGradeArray = [];
        try {
          // Parse JSON array if it's a string, or use it directly if it's already an array
          classGradeArray = typeof tg.class_grade_array === 'string' 
            ? JSON.parse(tg.class_grade_array)
            : tg.class_grade_array;
          
          console.log(`Target group ${tg.code} class_grade_array:`, classGradeArray);
        } catch (error) {
          console.error(`Error parsing class_grade_array for target group ${tg.code}:`, error);
        }
        
        // Check if class_grade_array includes contestant's class grade
        const classGradeInArray = Array.isArray(classGradeArray) && 
                                 classGradeArray.includes(contestantGrade);
        
        console.log(`Class grade ${contestantGrade} in array: ${classGradeInArray}`);
        
        // Only apply this condition if the education level and school level match
        if (eduLevel.toLowerCase().includes('sekolah menengah') && tg.schoolLevel === 'Secondary' && classGradeInArray) {
          console.log(`Match found: Secondary school with class grade ${contestantGrade} in array`);
          classGradeArrayCondition = true;
        } else if (eduLevel.toLowerCase().includes('sekolah rendah') && tg.schoolLevel === 'Primary' && classGradeInArray) {
          console.log(`Match found: Primary school with class grade ${contestantGrade} in array`);
          classGradeArrayCondition = true;
        }
      }
      
      // Special case: If it has class_grade_array but doesn't match conditions, exclude it
      if (tg.class_grade_array && !classGradeArrayCondition) {
        console.log(`Excluding target group ${tg.code}: has class_grade_array but contestant doesn't match`);
        return false;
      }
      
      // Apply the original condition OR the new condition
      const shouldInclude = originalCondition || classGradeArrayCondition;
      
      // If neither condition is met but it passed the age criteria, include it
      // Only for target groups without class_grade_array
      const defaultInclude = (!tg.contestant_class_grade || tg.contestant_class_grade === 'none') && 
                           !tg.class_grade_array;
      
      const result = shouldInclude || defaultInclude;
      console.log(`Target group ${tg.code} eligible: ${result}`);
      return result;
    });
    
    if (filteredTargetGroups.length === 0) {
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
          qb.alt_question,
          qb.main_lang,
          qb.alt_lang,
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
        alt_question: q.alt_question || null,
        main_lang: q.main_lang || null,
        alt_lang: q.alt_lang || null,
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
