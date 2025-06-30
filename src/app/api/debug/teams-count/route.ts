import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Count teams with eventcontestteam records
    const teamsWithEventContestTeam = await prisma.team.count({
      where: {
        eventcontestteam: {
          some: {}
        }
      }
    });

    // Count all teams
    const allTeams = await prisma.team.count();

    // Count teams in eventcontestteam
    const eventContestTeamCount = await prisma.eventcontestteam.count();
    
    // Count unique team IDs in eventcontestteam
    const uniqueTeamIdsResult = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT teamId) as uniqueTeamCount 
      FROM eventcontestteam
    `;
    const uniqueTeamCount = Number((uniqueTeamIdsResult as any)[0].uniqueTeamCount);
    
    // Count teams by zone with eventcontestteam records for zone 1
    const zoneId = 1; // Change this to your target zone
    const teamsInZoneWithEvents = await prisma.team.count({
      where: {
        eventcontestteam: { some: {} },
        OR: [
          {
            contingent: {
              contingentType: "SCHOOL",
              school: {
                state: {
                  zoneId
                }
              }
            }
          },
          {
            contingent: {
              contingentType: "INDEPENDENT",
              independent: {
                state: {
                  zoneId
                }
              }
            }
          }
        ]
      }
    });

    return NextResponse.json({
      teamsWithEventContestTeam,
      allTeams,
      eventContestTeamCount,
      uniqueTeamCount,
      teamsInZoneWithEvents,
      message: "Debug information retrieved successfully"
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json({ error: "Failed to retrieve debug information" }, { status: 500 });
  }
}
