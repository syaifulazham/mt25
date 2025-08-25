import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Test route for online registration API that doesn't require authentication
// This is for testing only and should not be exposed in production
export async function GET(req: NextRequest) {
  try {
    console.log("Test online-registration API called");
    
    // Use a known participant ID for testing
    const participantId = "304";
    
    console.log('Participant ID for testing:', participantId);
    
    // Get all online teams for this participant's contingents
    const onlineTeamsNoFilter = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM team t
      JOIN contingent cont ON t.contingentId = cont.id
      JOIN contingentManager cm ON cont.id = cm.contingentId
      JOIN event e ON e.scopeArea LIKE 'ONLINE_%'
      WHERE cm.participantId = ${parseInt(participantId)}
        AND t.status = 'ACTIVE'
    ` as any[];
    
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

      // Initialize age eligibility check
      let ageEligibilityCheck: any[] = [];

      // Check if age constraints exist and run the query if they do
      if (minAge !== null || maxAge !== null) {
        let ageQuery = `
          SELECT c.id
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

      // Get manager teams for this team
      // Using a more structured approach that matches zone-registration
      const managerTeams = await prisma.teamManager.findMany({
        where: {
          teamId: teamId
        },
        include: {
          participant: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true
            }
          }
        }
      });
      
      // Get independent managers directly associated with this team
      const independentManagers = await prisma.manager.findMany({
        where: {
          teamId: teamId
        },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true
        }
      });

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
        managerTeams: managerTeams.map((mt: any) => ({
          id: Number(mt.id),
          manager: {
            id: Number(mt.participant.id),
            name: mt.participant.name,
            email: mt.participant.email,
            phoneNumber: mt.participant.phoneNumber
          }
        })),
        independentManagers: independentManagers.map((manager: any) => ({
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
    console.error("Error fetching online registration test data:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json(
      { 
        error: "Failed to fetch online registration test data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
