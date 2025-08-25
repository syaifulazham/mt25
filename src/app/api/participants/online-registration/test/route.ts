import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let participantId: string | null = null;
  
  try {
    // No authentication check for testing purposes
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

    // Now apply filters (ignoring registration status) and count members with eligibility checks
    const teams = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.name as teamName,
        c.name as contestName,
        c.code as contestCode,
        e.name as eventName,
        e.scopeArea,
        COUNT(DISTINCT tm.contestantId) as numberOfMembers,
        c.minAge,
        c.maxAge,
        ect.status as registrationStatus
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
      GROUP BY t.id, t.name, c.name, c.code, e.name, e.scopeArea, c.minAge, c.maxAge, ect.status
      ORDER BY t.id
    `;

    console.log(`Found ${(teams as any[]).length} online teams:`, teams);

    // Check for multiple team memberships and age eligibility for each team
    const formattedTeams = await Promise.all((teams as any[]).map(async (team, index) => {
      const teamId = Number(team.id);
      const minAge = team.minAge ? Number(team.minAge) : null;
      const maxAge = team.maxAge ? Number(team.maxAge) : null;

      // Check for members in multiple teams
      const multipleTeamCheck = await prisma.$queryRaw`
        SELECT DISTINCT tm.contestantId
        FROM teamMember tm
        WHERE tm.teamId = ${teamId}
          AND tm.contestantId IN (
            SELECT tm2.contestantId
            FROM teamMember tm2
            JOIN team t2 ON tm2.teamId = t2.id
            WHERE t2.status = 'ACTIVE'
              AND tm2.teamId != ${teamId}
          )
      `;

      // Check for age eligibility issues
      let ageEligibilityCheck: any[] = [];
      if (minAge !== null || maxAge !== null) {
        let ageQuery = `
          SELECT tm.contestantId, c.age
          FROM teamMember tm
          JOIN contestant c ON tm.contestantId = c.id
          WHERE tm.teamId = ${teamId}
        `;
        
        if (minAge !== null && maxAge !== null) {
          ageQuery += ` AND (c.age < ${minAge} OR c.age > ${maxAge})`;
        } else if (minAge !== null) {
          ageQuery += ` AND c.age < ${minAge}`;
        } else if (maxAge !== null) {
          ageQuery += ` AND c.age > ${maxAge}`;
        }

        ageEligibilityCheck = await prisma.$queryRaw`${ageQuery}` as any[];
      }

      // Get managers (trainers) from the manager_team junction table
      const managerTeamRecords = await prisma.manager_team.findMany({
        where: {
          teamId: teamId
        },
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true
            }
          }
        }
      });
      
      // Extract managers from the junction records
      const managers = managerTeamRecords.map(record => record.manager);
      
      // For compatibility with the UI, create managerTeams structure 
      // that includes both manager and participant fields
      const managerTeams = managers.map(manager => ({
        id: Number(manager.id),
        manager: {
          id: Number(manager.id),
          name: manager.name,
          email: manager.email,
          phoneNumber: manager.phoneNumber
        },
        participant: {
          id: Number(manager.id),
          name: manager.name,
          email: manager.email,
          phoneNumber: manager.phoneNumber
        }
      }));
      
      // Keep independent managers for backward compatibility
      const independentManagers: Array<{id: number, name: string, email: string, phoneNumber: string | null}> = [];

      // Get the team status from eventcontestteam table
      const teamStatus = await prisma.$queryRaw`
        SELECT ect.status
        FROM eventcontestteam ect
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        WHERE ect.teamId = ${teamId}
        LIMIT 1
      ` as any[];
      
      return {
        id: teamId,
        recordNumber: index + 1,
        teamName: team.teamName,
        contestName: team.contestName,
        contestCode: team.contestCode,
        numberOfMembers: Number(team.numberOfMembers),
        status: teamStatus.length > 0 ? teamStatus[0].status : 'UNKNOWN',
        hasMultipleTeamMembers: (multipleTeamCheck as any[]).length > 0,
        hasMembersOutsideAgeRange: ageEligibilityCheck.length > 0,
        ineligibleMembersCount: ageEligibilityCheck.length,
        managerTeams: managerTeams.map((mt) => ({
          id: Number(mt.id),
          manager: {
            id: Number(mt.participant.id),
            name: mt.participant.name,
            email: mt.participant.email,
            phoneNumber: mt.participant.phoneNumber
          },
          participant: {
            id: Number(mt.participant.id),
            name: mt.participant.name,
            email: mt.participant.email,
            phoneNumber: mt.participant.phoneNumber
          }
        })),
        independentManagers: independentManagers.map(manager => ({
          id: Number(manager.id),
          name: manager.name,
          email: manager.email,
          phoneNumber: manager.phoneNumber
        }))
      };
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
