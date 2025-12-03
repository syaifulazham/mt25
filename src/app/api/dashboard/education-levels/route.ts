import { NextResponse } from 'next/server';
import { prismaExecute } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

// Force dynamic rendering to prevent static generation errors during build
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Authenticate the request
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has appropriate role to access data
    const userRole = session.user.role;
    if (!userRole || (userRole !== 'ADMIN' && userRole !== 'VIEWER')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }
    
    console.log('Fetching education levels by contest targetgroup...');
    
    // Use contest targetgroup to match Contest Participation by Contest Name methodology
    const results = await prismaExecute(async (prisma) => {
      // Get all contests with their targetgroups and participation counts
      const participationByContest = await prisma.contestParticipation.groupBy({
        by: ['contestId'],
        _count: {
          id: true
        }
      });
      
      if (participationByContest.length === 0) {
        return [];
      }
      
      // Get contest details with targetgroups
      const contestIds = participationByContest.map(p => p.contestId);
      const contests = await prisma.contest.findMany({
        where: {
          id: { in: contestIds }
        },
        include: {
          targetgroup: true
        }
      });
      
      // Create a map for quick lookup
      const contestMap = new Map();
      contests.forEach(contest => {
        contestMap.set(contest.id, contest);
      });
      
      // Aggregate counts by targetgroup school level
      const levelCounts: Record<string, number> = {};
      
      participationByContest.forEach(participation => {
        const contest = contestMap.get(participation.contestId);
        if (!contest) return;
        
        // Get school level from targetgroup
        let schoolLevel = 'OTHER';
        if (contest.targetgroup && Array.isArray(contest.targetgroup) && contest.targetgroup.length > 0) {
          schoolLevel = contest.targetgroup[0].schoolLevel || 'OTHER';
        }
        
        // Aggregate the count
        levelCounts[schoolLevel] = (levelCounts[schoolLevel] || 0) + participation._count.id;
      });
      
      // Convert to array format
      return Object.entries(levelCounts).map(([level, count]) => ({
        level,
        count
      }));
    });
    
    console.log(`Found ${results.length} education levels by contest targetgroup`);
    
    // Format the data for the chart
    const educationLevelData = Array.isArray(results) ? 
      results.map(item => ({
        level: (item.level || 'Unknown').toUpperCase(), // Force uppercase
        count: Number(item.count) // Ensure count is a number
      })) : [];
    
    console.log('Education level data:', educationLevelData);
    
    return NextResponse.json(educationLevelData);
  } catch (error) {
    console.error('Error accessing education level data:', error);
    return NextResponse.json(
      { error: 'Failed to load education level data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
