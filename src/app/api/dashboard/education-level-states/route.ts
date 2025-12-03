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
      
      // Get gender breakdown by contest and state
      const genderByContestState = await prisma.$queryRaw<Array<{
        contestId: number;
        stateName: string | null;
        gender: string;
        count: bigint;
      }>>`
        SELECT 
          co.id as contestId,
          COALESCE(s.name, 'Unknown') as stateName,
          COALESCE(c.gender, 'Unknown') as gender,
          COUNT(cp.id) as count
        FROM contestParticipation cp
        JOIN contestant c ON cp.contestantId = c.id
        JOIN contest co ON cp.contestId = co.id
        JOIN contingent ct ON c.contingentId = ct.id
        LEFT JOIN school sc ON ct.schoolId = sc.id
        LEFT JOIN independent ind ON ct.independentId = ind.id
        LEFT JOIN state s ON (
          CASE 
            WHEN sc.id IS NOT NULL THEN sc.stateId
            WHEN ind.id IS NOT NULL THEN ind.stateId
          END
        ) = s.id
        GROUP BY co.id, s.name, c.gender
      `;
      
      const statesByCategory: Record<string, Record<string, { total: number; male: number; female: number }>> = {
        Kids: {},
        Teens: {},
        Youth: {}
      };
      
      genderByContestState.forEach((item) => {
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
        const stateName = item.stateName || 'Unknown';
        
        if (!statesByCategory[category][stateName]) {
          statesByCategory[category][stateName] = { total: 0, male: 0, female: 0 };
        }
        
        statesByCategory[category][stateName].total += count;
        if (isMale) statesByCategory[category][stateName].male += count;
        if (isFemale) statesByCategory[category][stateName].female += count;
      });
      
      // Format state data
      const formatStates = (categoryData: Record<string, { total: number; male: number; female: number }>) => {
        return Object.entries(categoryData)
          .map(([state, data]) => ({ state, total: data.total, male: data.male, female: data.female }))
          .sort((a, b) => b.total - a.total);
      };
      
      return {
        Kids: formatStates(statesByCategory.Kids),
        Teens: formatStates(statesByCategory.Teens),
        Youth: formatStates(statesByCategory.Youth)
      };
    });
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in education-level-states:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
