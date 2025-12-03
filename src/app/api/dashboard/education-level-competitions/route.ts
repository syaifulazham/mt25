import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaExecute } from '@/lib/prisma-execute';

// Helper function to normalize school levels
function normalizeToDisplayCategory(schoolLevel: string): 'Kids' | 'Teens' | 'Youth' {
  const normalized = schoolLevel.toUpperCase();
  
  if (normalized.includes('PRIMARY') || normalized.includes('RENDAH')) {
    return 'Kids';
  }
  
  if (normalized.includes('SECONDARY') || normalized.includes('MENENGAH')) {
    return 'Teens';
  }
  
  if (normalized.includes('UNIVERSITY') || normalized.includes('COLLEGE') || 
      normalized.includes('BELIA') || normalized.includes('YOUTH')) {
    return 'Youth';
  }
  
  return 'Youth';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userRole = session.user.role;
    if (!userRole || (userRole !== 'ADMIN' && userRole !== 'VIEWER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const data = await prismaExecute(async (prisma) => {
      // Get contests with targetgroups
      const contests = await prisma.contest.findMany({
        include: {
          targetgroup: true
        }
      });
      
      const contestMap = new Map();
      contests.forEach(contest => {
        contestMap.set(contest.id, contest);
      });
      
      // Get gender breakdown by contest
      const genderByContest = await prisma.$queryRaw<Array<{
        contestId: number;
        gender: string;
        count: bigint;
      }>>`
        SELECT 
          co.id as contestId,
          COALESCE(c.gender, 'Unknown') as gender,
          COUNT(cp.id) as count
        FROM contestParticipation cp
        JOIN contestant c ON cp.contestantId = c.id
        JOIN contest co ON cp.contestId = co.id
        GROUP BY co.id, c.gender
      `;
      
      const competitionsByCategory: Record<string, Record<string, { total: number; male: number; female: number }>> = {
        Kids: {},
        Teens: {},
        Youth: {}
      };
      
      genderByContest.forEach((item) => {
        const contest = contestMap.get(item.contestId);
        if (!contest) return;
        
        const count = Number(item.count);
        const gender = item.gender.toLowerCase();
        const isMale = gender === 'male';
        const isFemale = gender === 'female';
        
        // Get school level from targetgroup
        let schoolLevel = 'OTHER';
        if (contest.targetgroup && Array.isArray(contest.targetgroup) && contest.targetgroup.length > 0) {
          schoolLevel = contest.targetgroup[0].schoolLevel || 'OTHER';
        }
        
        const category = normalizeToDisplayCategory(schoolLevel);
        const competitionKey = `${contest.code}|||${contest.name}`;
        
        if (!competitionsByCategory[category][competitionKey]) {
          competitionsByCategory[category][competitionKey] = { total: 0, male: 0, female: 0 };
        }
        
        competitionsByCategory[category][competitionKey].total += count;
        if (isMale) competitionsByCategory[category][competitionKey].male += count;
        if (isFemale) competitionsByCategory[category][competitionKey].female += count;
      });
      
      // Format competition data
      const formatCompetitions = (categoryData: Record<string, { total: number; male: number; female: number }>) => {
        return Object.entries(categoryData)
          .map(([key, data]) => {
            const [code, name] = key.split('|||');
            return { code, name, total: data.total, male: data.male, female: data.female };
          })
          .sort((a, b) => b.total - a.total);
      };
      
      return {
        Kids: formatCompetitions(competitionsByCategory.Kids),
        Teens: formatCompetitions(competitionsByCategory.Teens),
        Youth: formatCompetitions(competitionsByCategory.Youth)
      };
    });
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in education-level-competitions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
