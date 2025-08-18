import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let participantId: string | null = null;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    participantId = searchParams.get("participantId");

    if (!participantId) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 });
    }

    console.log(`Fetching online teams for participant: ${participantId}`);

    // First, let's check what teams exist for this participant
    const allTeams = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.name as teamName,
        c.name as contestName,
        c.code as contestCode,
        e.name as eventName,
        e.scopeArea,
        ect.status as registrationStatus,
        t.status as teamStatus
      FROM team t
      JOIN contest c ON t.contestId = c.id
      JOIN eventcontest ec ON c.id = ec.contestId
      JOIN event e ON ec.eventId = e.id
      JOIN eventcontestteam ect ON ec.id = ect.eventcontestId AND ect.teamId = t.id
      JOIN contingent cont ON t.contingentId = cont.id
      JOIN contingentManager cm ON cont.id = cm.contingentId
      WHERE cm.participantId = ${parseInt(participantId)}
      ORDER BY t.id
    `;

    console.log(`All teams for participant ${participantId}:`, allTeams);

    // Now filter for online events - let's check each condition separately
    console.log('Checking online events with individual conditions...');
    
    // Check teams with ONLINE scopeArea (no status filters)
    const onlineTeamsNoFilter = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.name as teamName,
        c.name as contestName,
        c.code as contestCode,
        e.name as eventName,
        e.scopeArea,
        ect.status as registrationStatus,
        t.status as teamStatus
      FROM team t
      JOIN contest c ON t.contestId = c.id
      JOIN eventcontest ec ON c.id = ec.contestId
      JOIN event e ON ec.eventId = e.id
      JOIN eventcontestteam ect ON ec.id = ect.eventcontestId AND ect.teamId = t.id
      JOIN contingent cont ON t.contingentId = cont.id
      JOIN contingentManager cm ON cont.id = cm.contingentId
      WHERE cm.participantId = ${parseInt(participantId)}
        AND e.scopeArea LIKE 'ONLINE_%'
      ORDER BY t.id
    `;
    
    console.log('Online teams (no status filter):', onlineTeamsNoFilter);

    // Now apply filters (ignoring registration status) and count members
    const teams = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.name as teamName,
        c.name as contestName,
        c.code as contestCode,
        e.name as eventName,
        e.scopeArea,
        COUNT(DISTINCT tm.contestantId) as numberOfMembers
      FROM team t
      JOIN contest c ON t.contestId = c.id
      JOIN eventcontest ec ON c.id = ec.contestId
      JOIN event e ON ec.eventId = e.id
      JOIN eventcontestteam ect ON ec.id = ect.eventcontestId AND ect.teamId = t.id
      JOIN contingent cont ON t.contingentId = cont.id
      JOIN contingentManager cm ON cont.id = cm.contingentId
      LEFT JOIN teamMember tm ON t.id = tm.teamId
      WHERE cm.participantId = ${parseInt(participantId)}
        AND e.scopeArea LIKE 'ONLINE_%'
        AND t.status = 'ACTIVE'
      GROUP BY t.id, t.name, c.name, c.code, e.name, e.scopeArea
      ORDER BY t.id
    `;

    console.log(`Found ${(teams as any[]).length} online teams:`, teams);

    // Format teams with proper type conversion
    const formattedTeams = (teams as any[]).map((team, index) => ({
      id: Number(team.id),
      recordNumber: index + 1,
      teamName: team.teamName,
      contestName: team.contestName,
      contestCode: team.contestCode,
      numberOfMembers: Number(team.numberOfMembers),
      hasMultipleTeamMembers: false,
      hasMembersOutsideAgeRange: false,
      managerTeams: [] // Will be populated separately if needed
    }));

    return NextResponse.json({
      teams: formattedTeams,
      totalCount: formattedTeams.length
    });

  } catch (error) {
    console.error("Error fetching online registration data:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      participantId: participantId || 'undefined'
    });
    return NextResponse.json(
      { 
        error: "Failed to fetch online registration data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
