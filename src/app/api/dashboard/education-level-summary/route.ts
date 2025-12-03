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
      // Quick check for participation count
      const participationCheck = await prisma.contestParticipation.count();
      
      if (participationCheck === 0) {
        return {
          totalParticipation: 0,
          kids: 0,
          teens: 0,
          youth: 0,
          genderBreakdown: {
            Total: { Male: 0, Female: 0, Unknown: 0 },
            Kids: { Male: 0, Female: 0, Unknown: 0 },
            Teens: { Male: 0, Female: 0, Unknown: 0 },
            Youth: { Male: 0, Female: 0, Unknown: 0 }
          }
        };
      }
      
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
      
      let totalParticipation = 0;
      const categoryCounts = { Kids: 0, Teens: 0, Youth: 0 };
      const categoryGenderCounts = {
        Total: { Male: 0, Female: 0, Unknown: 0 },
        Kids: { Male: 0, Female: 0, Unknown: 0 },
        Teens: { Male: 0, Female: 0, Unknown: 0 },
        Youth: { Male: 0, Female: 0, Unknown: 0 }
      };
      
      genderByContest.forEach((item) => {
        const contest = contestMap.get(item.contestId);
        if (!contest) return;
        
        const count = Number(item.count);
        const gender = item.gender.toLowerCase() === 'male' ? 'Male' : 
                      item.gender.toLowerCase() === 'female' ? 'Female' : 'Unknown';
        
        // Get school level from targetgroup
        let schoolLevel = 'OTHER';
        if (contest.targetgroup && Array.isArray(contest.targetgroup) && contest.targetgroup.length > 0) {
          schoolLevel = contest.targetgroup[0].schoolLevel || 'OTHER';
        }
        
        const category = normalizeToDisplayCategory(schoolLevel);
        
        totalParticipation += count;
        categoryCounts[category as keyof typeof categoryCounts] += count;
        categoryGenderCounts.Total[gender as keyof typeof categoryGenderCounts.Total] += count;
        categoryGenderCounts[category as keyof typeof categoryGenderCounts][gender as keyof typeof categoryGenderCounts.Total] += count;
      });
      
      return {
        totalParticipation,
        kids: categoryCounts.Kids,
        teens: categoryCounts.Teens,
        youth: categoryCounts.Youth,
        genderBreakdown: categoryGenderCounts
      };
    });
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in education-level-summary:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
