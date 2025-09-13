import { NextRequest, NextResponse } from 'next/server';
import { prismaExecute } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { hashcode: string } }
) {
  try {
    const { hashcode } = params;

    if (!hashcode) {
      return NextResponse.json(
        { success: false, message: 'Hashcode is required' },
        { status: 400 }
      );
    }

    // Find contestant by hashcode
    const contestants = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT 
          c.id,
          c.name,
          c.ic,
          c.email,
          c.gender,
          c.age,
          c.edu_level,
          c.class_grade,
          c.class_name,
          c.contingentId
        FROM contestant c
        WHERE c.hashcode = ${hashcode} AND c.status = 'ACTIVE'
        LIMIT 1
      `
    ) as any[];

    if (contestants.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Contestant not found' },
        { status: 404 }
      );
    }

    const contestant = contestants[0];

    // Get contingent information
    const contingents = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT name, logoUrl
        FROM contingent
        WHERE id = ${contestant.contingentId}
        LIMIT 1
      `
    ) as any[];

    const contingent = contingents.length > 0 ? contingents[0] : null;

    // Get microsite login count
    const microsites = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT loginCounter FROM microsite 
        WHERE contestantId = ${contestant.id}
        LIMIT 1
      `
    ) as any[];

    const loginCount = microsites.length > 0 ? Number(microsites[0].loginCounter) : 0;

    // Get eligible target groups for this contestant based on age and education level
    const contestantAge = Number(contestant.age) || 0;
    const eduLevel = contestant.edu_level?.toLowerCase() || '';
    const contestantClassGrade = contestant.class_grade || null;
    
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

    // Get eligible target groups for this contestant
    const eligibleTargetGroups = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT 
          code, 
          name,
          contestant_class_grade,
          minAge,
          maxAge,
          schoolLevel
        FROM targetgroup 
        WHERE (
          -- If contestant_class_grade is specified, ignore age restrictions
          (contestant_class_grade IS NOT NULL AND contestant_class_grade != '' AND contestant_class_grade != 'none') OR
          -- Otherwise apply age restrictions
          (minAge <= ${contestantAge} AND maxAge >= ${contestantAge})
        )
      `
    ) as any[];
    
    console.log(`Found ${eligibleTargetGroups.length} potentially eligible target groups for contestant:`, {
      contestantAge,
      eduLevel,
      schoolLevel: schoolLevel,
      eligibleTargetGroups: eligibleTargetGroups.map(tg => ({ code: tg.code, name: tg.name, schoolLevel: tg.schoolLevel }))
    });

    // Filter target groups that match contestant's class grade only if specified
    // We're ignoring school level condition as requested
    const filteredTargetGroups = eligibleTargetGroups.filter(tg => {
      console.log(`Checking target group ${tg.code} (${tg.name}) - minAge: ${tg.minAge}, maxAge: ${tg.maxAge}, contestant age: ${contestantAge}`);
      
      // If target group has a specific class grade requirement
      if (tg.contestant_class_grade && tg.contestant_class_grade !== 'none') {
        // Only include if it matches contestant's class grade
        const matches = tg.contestant_class_grade === contestantClassGrade;
        if (!matches) {
          console.log(`Filtering out target group ${tg.code} - Class grade ${tg.contestant_class_grade} doesn't match contestant class grade ${contestantClassGrade}`);
        }
        return matches;
      }
      
      // Include all target groups with no specific class grade requirement
      // This will use only the age range check from the SQL query
      return true;
    });
    
    const targetGroupCodes = filteredTargetGroups.map(tg => tg.code);
    
    console.log(`After filtering, ${filteredTargetGroups.length} target groups match for contestant:`, {
      contestantAge,
      eduLevel,
      schoolLevel: schoolLevel,
      filteredTargetGroups: filteredTargetGroups.map(tg => ({ code: tg.code, name: tg.name, schoolLevel: tg.schoolLevel }))
    });

    // Get published quizzes matching contestant's eligible target groups
    let quizzes: any[] = [];
    
    if (targetGroupCodes.length > 0) {
      // Use individual queries for each target group to avoid SQL injection issues
      const quizPromises = targetGroupCodes.map(async (code) => {
        return await prismaExecute(async (prisma) => 
          prisma.$queryRaw`
            SELECT 
              q.id,
              q.quiz_name as title,
              q.description,
              q.time_limit as duration,
              q.target_group,
              q.publishedAt,
              q.createdAt,
              COUNT(qq.questionId) as totalQuestions,
              tg.name as targetGroupName
            FROM quiz q
            LEFT JOIN quiz_question qq ON q.id = qq.quizId
            LEFT JOIN targetgroup tg ON q.target_group = tg.code
            WHERE q.status = 'published' 
            AND q.target_group = ${code}
            GROUP BY q.id, q.quiz_name, q.description, q.time_limit, q.target_group, q.publishedAt, q.createdAt, tg.name
          `
        ) as any[];
      });
      
      const quizResults = await Promise.all(quizPromises);
      quizzes = quizResults.flat().sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    const responseData = {
      success: true,
      contestant: {
        id: Number(contestant.id),
        name: contestant.name || '',
        ic: contestant.ic || '',
        email: contestant.email || '',
        gender: contestant.gender || '',
        age: Number(contestant.age) || 0,
        edu_level: contestant.edu_level || '',
        class_grade: contestant.class_grade || '',
        class_name: contestant.class_name || ''
      },
      contingent: {
        id: Number(contestant.contingentId),
        name: contingent?.name || 'Unknown Contingent',
        logoUrl: contingent?.logoUrl || null,
        institutionName: contingent?.name || 'Unknown Institution',
        contingentType: null
      },
      scheduledQuizzes: await Promise.all(quizzes.map(async (quiz: any) => {
        // Check if contestant has completed this quiz
        const attempts = await prismaExecute(async (prisma) => 
          prisma.$queryRaw`
            SELECT 
              qa.id,
              qa.status,
              qa.score,
              qa.time_taken,
              qa.start_time,
              qa.end_time
            FROM quiz_attempt qa
            WHERE qa.contestantId = ${Number(contestant.id)} 
            AND qa.quizId = ${Number(quiz.id)}
            ORDER BY qa.createdAt DESC
            LIMIT 1
          `
        ) as any[];

        const attempt = attempts.length > 0 ? attempts[0] : null;
        const isCompleted = attempt && attempt.status === 'completed';

        return {
          id: Number(quiz.id),
          title: quiz.title || '',
          description: quiz.description || '',
          duration: Number(quiz.duration) || null,
          targetGroup: quiz.target_group || '',
          targetGroupName: quiz.targetGroupName || quiz.target_group || '',
          publishedAt: quiz.publishedAt,
          totalQuestions: Number(quiz.totalQuestions) || 0,
          status: 'published', // All fetched quizzes are published
          canStart: !isCompleted, // Can only start if not completed
          attempt: attempt ? {
            id: Number(attempt.id),
            status: attempt.status,
            score: Number(attempt.score) || 0,
            timeTaken: Number(attempt.time_taken) || 0,
            startTime: attempt.start_time,
            endTime: attempt.end_time,
            isCompleted: isCompleted
          } : null
        };
      })),
      loginCount
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Arena contestant data error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
