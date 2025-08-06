import { NextRequest, NextResponse } from 'next/server';
import { prismaExecute } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const hashcode = '448C9448B3AA';
    
    // Get contestant data
    const contestants = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT id, name, age, edu_level
        FROM contestant
        WHERE hashcode = ${hashcode} AND status = 'ACTIVE'
        LIMIT 1
      `
    ) as any[];

    if (contestants.length === 0) {
      return NextResponse.json({ error: 'Contestant not found' });
    }

    const contestant = contestants[0];
    const contestantAge = Number(contestant.age) || 0;
    const eduLevel = contestant.edu_level?.toLowerCase() || '';
    
    // Determine school level
    const getSchoolLevel = (eduLevel: string) => {
      if (eduLevel.includes('rendah') || eduLevel.includes('primary')) {
        return 'Primary';
      } else if (eduLevel.includes('menengah') || eduLevel.includes('secondary')) {
        return 'Secondary';
      } else if (eduLevel.includes('universiti') || eduLevel.includes('university') || eduLevel.includes('college')) {
        return 'Higher Education';
      } else {
        return 'Primary';
      }
    };

    const schoolLevel = getSchoolLevel(eduLevel);

    // Get eligible target groups
    const eligibleTargetGroups = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT code, name, minAge, maxAge, schoolLevel 
        FROM targetgroup 
        WHERE minAge <= ${contestantAge} 
        AND maxAge >= ${contestantAge}
        AND (schoolLevel = ${schoolLevel} OR code = 'OA')
      `
    ) as any[];

    const targetGroupCodes = eligibleTargetGroups.map(tg => tg.code);

    // Get all published quizzes
    const allQuizzes = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT id, quiz_name, target_group, status
        FROM quiz 
        WHERE status = 'published'
      `
    ) as any[];

    // Get matching quizzes
    const matchingQuizzes = targetGroupCodes.length > 0 ? await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT 
          q.id,
          q.quiz_name as title,
          q.target_group,
          tg.name as targetGroupName
        FROM quiz q
        LEFT JOIN targetgroup tg ON q.target_group = tg.code
        WHERE q.status = 'published' 
        AND q.target_group IN (${targetGroupCodes.map(code => `'${code}'`).join(',')})
      `
    ) as any[] : [];

    return NextResponse.json({
      contestant: {
        id: contestant.id,
        name: contestant.name,
        age: contestantAge,
        edu_level: contestant.edu_level,
        schoolLevel: schoolLevel
      },
      eligibleTargetGroups,
      targetGroupCodes,
      allPublishedQuizzes: allQuizzes,
      matchingQuizzes,
      debug: {
        sqlQuery: targetGroupCodes.length > 0 ? 
          `SELECT * FROM quiz WHERE status = 'published' AND target_group IN (${targetGroupCodes.map(code => `'${code}'`).join(',')})` : 
          'No target groups found'
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Debug error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
