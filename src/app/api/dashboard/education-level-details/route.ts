import { NextResponse } from 'next/server';
import { prismaExecute } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

export const dynamic = 'force-dynamic';

// Function to normalize school level to display categories
function normalizeToDisplayCategory(schoolLevel: string): string {
  const normalized = schoolLevel?.toLowerCase().trim() || '';
  
  if (normalized.includes('primary') || 
      normalized.includes('sekolah rendah') ||
      normalized.includes('rendah') ||
      normalized.includes('kids')) {
    return 'Kids';
  }
  
  if (normalized.includes('secondary') || 
      normalized.includes('sekolah menengah') ||
      normalized.includes('menengah') ||
      normalized.includes('teens')) {
    return 'Teens';
  }
  
  if (normalized.includes('university') || 
      normalized.includes('universiti') ||
      normalized.includes('college') || 
      normalized.includes('kolej') ||
      normalized.includes('higher') || 
      normalized.includes('tinggi') ||
      normalized.includes('youth') ||
      normalized.includes('belia')) {
    return 'Youth';
  }
  
  return 'Youth';
}

export async function GET() {
  try {
    console.log('=== Education Level Details API Called ===');
    
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      console.log('Unauthorized: No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userRole = session.user.role;
    if (!userRole || (userRole !== 'ADMIN' && userRole !== 'VIEWER')) {
      console.log('Forbidden: Invalid role', userRole);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    console.log('Fetching education level details...');
    
    const data = await prismaExecute(async (prisma) => {
      console.log('Step 1: Checking if participation data exists...');
      
      // Quick check for participation count
      const participationCheck = await prisma.contestParticipation.count();
      
      console.log(`Found ${participationCheck} total participation records`);
      
      if (participationCheck === 0) {
        console.log('No participation data found, returning empty result');
        return {
          totalParticipation: 0,
          kids: 0,
          teens: 0,
          youth: 0,
          competitionsByCategory: { Kids: [], Teens: [], Youth: [] },
          statesByCategory: { Kids: [], Teens: [], Youth: [] }
        };
      }
      
      // Now get actual counts per contest-state combination
      console.log('Step 2: Getting participation counts...');
      const countsByContestState = await prisma.$queryRaw<Array<{
        contestId: number;
        stateName: string | null;
        count: bigint;
      }>>`
        SELECT 
          co.id as contestId,
          COALESCE(s.name, 'Unknown') as stateName,
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
        GROUP BY co.id, s.name
      `;
      
      console.log(`Found ${countsByContestState.length} contest-state count combinations`);
      
      // Get contest details with targetgroup
      console.log('Step 3: Fetching contest targetgroup info...');
      const contestIds = [...new Set(countsByContestState.map(item => item.contestId))];
      const contests = await prisma.contest.findMany({
        where: {
          id: { in: contestIds }
        },
        include: {
          targetgroup: true
        }
      });
      
      console.log(`Found ${contests.length} contests with targetgroups`);
      
      const contestMap = new Map();
      contests.forEach(contest => {
        contestMap.set(contest.id, contest);
      });
      
      // Aggregate data
      console.log('Step 4: Aggregating data by categories...');
      let totalParticipation = 0;
      const categoryCounts = { Kids: 0, Teens: 0, Youth: 0 };
      const competitionsByCategory: Record<string, Record<string, number>> = {
        Kids: {},
        Teens: {},
        Youth: {}
      };
      const statesByCategory: Record<string, Record<string, number>> = {
        Kids: {},
        Teens: {},
        Youth: {}
      };
      
      // Process each contest-state count combination
      countsByContestState.forEach((item) => {
        const contest = contestMap.get(item.contestId);
        if (!contest) return;
        
        const count = Number(item.count);
        totalParticipation += count;
        
        // Get school level from targetgroup
        let schoolLevel = 'OTHER';
        if (contest.targetgroup && Array.isArray(contest.targetgroup) && contest.targetgroup.length > 0) {
          schoolLevel = contest.targetgroup[0].schoolLevel || 'OTHER';
        }
        
        const category = normalizeToDisplayCategory(schoolLevel);
        categoryCounts[category as keyof typeof categoryCounts] += count;
        
        // By competition
        const competitionKey = `${contest.code}|||${contest.name}`;
        competitionsByCategory[category][competitionKey] = 
          (competitionsByCategory[category][competitionKey] || 0) + count;
        
        // By state - use actual state from contestant's contingent
        const stateName = item.stateName || 'Unknown';
        statesByCategory[category][stateName] = 
          (statesByCategory[category][stateName] || 0) + count;
      });
      
      // Format competition data
      const formatCompetitions = (categoryData: Record<string, number>) => {
        return Object.entries(categoryData)
          .map(([key, total]) => {
            const [code, name] = key.split('|||');
            return { code, name, total };
          })
          .sort((a, b) => b.total - a.total);
      };
      
      // Format state data
      const formatStates = (categoryData: Record<string, number>) => {
        return Object.entries(categoryData)
          .map(([state, total]) => ({ state, total }))
          .sort((a, b) => b.total - a.total);
      };
      
      console.log('Step 5: Formatting final result...');
      console.log('Category counts:', categoryCounts);
      console.log('Total participation:', totalParticipation);
      console.log('States by category sample:', {
        Kids: Object.keys(statesByCategory.Kids).slice(0, 3),
        Teens: Object.keys(statesByCategory.Teens).slice(0, 3),
        Youth: Object.keys(statesByCategory.Youth).slice(0, 3)
      });
      
      const result = {
        totalParticipation,
        kids: categoryCounts.Kids,
        teens: categoryCounts.Teens,
        youth: categoryCounts.Youth,
        competitionsByCategory: {
          Kids: formatCompetitions(competitionsByCategory.Kids),
          Teens: formatCompetitions(competitionsByCategory.Teens),
          Youth: formatCompetitions(competitionsByCategory.Youth)
        },
        statesByCategory: {
          Kids: formatStates(statesByCategory.Kids),
          Teens: formatStates(statesByCategory.Teens),
          Youth: formatStates(statesByCategory.Youth)
        }
      };
      
      console.log('Result summary - Competitions:', {
        Kids: result.competitionsByCategory.Kids.length,
        Teens: result.competitionsByCategory.Teens.length,
        Youth: result.competitionsByCategory.Youth.length
      });
      
      return result;
    });
    
    console.log('Education level details fetched successfully');
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('=== Error fetching education level details ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to load data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
