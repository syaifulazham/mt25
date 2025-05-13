import { NextRequest, NextResponse } from "next/server";
import { prismaExecute } from "@/lib/prisma";
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const themeId = searchParams.get("themeId");

    if (!themeId) {
      // If no themeId provided, return all contests using prismaExecute for connection management
      const contestsData = await prismaExecute(prisma => prisma.contest.findMany({
        include: {
          targetgroup: true,
          theme: true
        }
      }));
      
      // Transform exactly like organizer page does
      const contests = contestsData.map(contest => ({
        id: contest.id,
        code: contest.code,
        name: contest.name,
        description: contest.description,
        contestType: contest.contestType,
        participation_mode: contest.participation_mode || 'INDIVIDUAL',
        maxMembersPerTeam: contest.maxMembersPerTeam,
        startDate: contest.startDate,
        endDate: contest.endDate,
        // Create targetgroups array from targetgroup data
        targetgroups: Array.isArray(contest.targetgroup) ? 
          contest.targetgroup.map((tg: any) => ({
            id: tg.id,
            name: tg.name,
            schoolLevel: tg.schoolLevel,
            ageGroup: tg.ageGroup
          })) : 
          typeof contest.targetgroup === 'object' && contest.targetgroup ? 
          [{
            id: contest.targetgroup.id,
            name: contest.targetgroup.name,
            schoolLevel: contest.targetgroup.schoolLevel,
            ageGroup: contest.targetgroup.ageGroup
          }] : [],
        // Set theme with proper structure
        theme: contest.theme ? {
          id: contest.theme.id,
          name: contest.theme.name,
          color: contest.theme.color,
          logoPath: contest.theme.logoPath
        } : null
      }));
      
      return NextResponse.json(contests);
    }

    // Convert theme ID to number
    const themeIdNumber = parseInt(themeId, 10);
    // Get contests by theme ID using prismaExecute for connection management
    const contestsData = await prismaExecute(prisma => prisma.contest.findMany({
      where: {
        themeId: parseInt(themeId)
      },
      include: {
        targetgroup: true,
        theme: true
      }
    }));
    
    console.log(`Found ${contestsData.length} contests with themeId: ${themeIdNumber}`);
    
    // Transform exactly like organizer page does
    const contests = contestsData.map(contest => ({
      id: contest.id,
      code: contest.code,
      name: contest.name,
      description: contest.description,
      contestType: contest.contestType,
      participation_mode: contest.participation_mode || 'INDIVIDUAL',
      maxMembersPerTeam: contest.maxMembersPerTeam,
      startDate: contest.startDate,
      endDate: contest.endDate,
      // Create targetgroups array from targetgroup data
      targetgroups: Array.isArray(contest.targetgroup) ? 
        contest.targetgroup.map((tg: any) => ({
          id: tg.id,
          name: tg.name,
          schoolLevel: tg.schoolLevel,
          ageGroup: tg.ageGroup
        })) : 
        typeof contest.targetgroup === 'object' && contest.targetgroup ? 
        [{
          id: contest.targetgroup.id,
          name: contest.targetgroup.name,
          schoolLevel: contest.targetgroup.schoolLevel,
          ageGroup: contest.targetgroup.ageGroup
        }] : [],
      // Set theme with proper structure
      theme: contest.theme ? {
        id: contest.theme.id,
        name: contest.theme.name,
        color: contest.theme.color,
        logoPath: contest.theme.logoPath
      } : null
    }));
    
    // Debug output
    if (contests.length > 0) {
      console.log('First contest after transformation:', {
        id: contests[0].id,
        name: contests[0].name,
        targetgroups: contests[0].targetgroups
      });
    }
    
    return NextResponse.json(contests);
  } catch (error) {
    console.error("Error fetching contests:", error);
    return NextResponse.json(
      { error: "Failed to fetch contests" },
      { status: 500 }
    );
  }
}
