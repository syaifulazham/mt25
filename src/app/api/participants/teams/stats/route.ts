import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

// To avoid TypeScript errors with Prisma schema mismatches,
// we'll use a direct SQL query approach that's more reliable

// GET handler - Get participant's team statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get participant ID from query params
    const searchParams = request.nextUrl.searchParams;
    const participantIdParam = searchParams.get("participantId");
    
    if (!participantIdParam) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 });
    }
    
    const participantId = parseInt(participantIdParam);
    
    // Use direct SQL query to avoid Prisma schema issues - this is the same approach used in other parts of the app
    const teamQuery = `
      SELECT t.id, t.name, t.hashcode, t.status, t.contestId, t.maxMembers, t.createdAt, t.updatedAt,
             c.name as contestName, c.code as contestCode,
             cn.name as contingentName
      FROM team t
      LEFT JOIN contest c ON t.contestId = c.id
      LEFT JOIN contingent cn ON t.contingentId = cn.id
      WHERE t.id IN (
        -- Teams where the participant is a manager
        SELECT DISTINCT tm.teamId 
        FROM teamManager tm
        WHERE tm.participantId = ?
        
        UNION
        
        -- Teams where the participant is a member
        SELECT DISTINCT tmem.teamId
        FROM teamMember tmem
        WHERE tmem.participantId = ?
      )
    `;
    
    const teamsResult = await prisma.$queryRawUnsafe(teamQuery, participantId, participantId) as any[];
    
    // For each team, get the member count
    const teamsWithMemberCounts = await Promise.all(teamsResult.map(async (team: any) => {
      const memberCountQuery = `
        SELECT COUNT(*) as memberCount
        FROM teamMember
        WHERE teamId = ?
      `;
      
      const memberCountResult = await prisma.$queryRawUnsafe(memberCountQuery, team.id) as any[];
      const memberCount = memberCountResult[0]?.memberCount || 0;
      
      return {
        ...team,
        memberCount
      };
    }));
    
    // Calculate statistics to match what the component expects
    const stats = {
      total: teamsWithMemberCounts.length,
      teams: teamsWithMemberCounts.map((team: any) => ({
        id: team.id,
        name: team.name,
        contestId: team.contestId,
        contestName: team.contestName || "Unknown Contest",
        memberCount: team.memberCount || 0,
        maxMembers: team.maxMembers || 4,
        createdAt: team.createdAt
      }))
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching team stats:", error);
    return NextResponse.json({ error: "Failed to fetch team statistics" }, { status: 500 });
  }
}
