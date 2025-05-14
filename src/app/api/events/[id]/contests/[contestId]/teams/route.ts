import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { authenticateAdminAPI } from "@/lib/api-middlewares";

// GET /api/events/[id]/contests/[contestId]/teams
// Get all teams for a specific event contest
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; contestId: string } }
) {
  try {
    // Authenticate the user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const eventId = parseInt(params.id);
    const eventContestId = parseInt(params.contestId);

    if (isNaN(eventId) || isNaN(eventContestId)) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    // Check if the event contest exists
    const eventContest = await prisma.eventcontest.findUnique({
      where: {
        id: eventContestId,
        eventId: eventId,
      },
      include: {
        event: true,
        contest: true,
      },
    });

    if (!eventContest) {
      return NextResponse.json(
        { error: "Event contest not found" },
        { status: 404 }
      );
    }

    // Get all teams for this event contest
    const teams = await prisma.team.findMany({
      where: {
        eventcontestId: eventContestId,
      },
      include: {
        contingent: {
          include: {
            school: true,
            higherInstitution: true,
            independent: true,
          },
        },
        members: true,
        documents: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Process teams to format contingent information
    const formattedTeams = teams.map(team => {
      let contingentType = 'UNKNOWN';
      let contingentName = 'Unknown';

      if (team.contingent.schoolId) {
        contingentType = 'SCHOOL';
        contingentName = team.contingent.school?.name || 'Unknown School';
      } else if (team.contingent.higherInstitutionId) {
        contingentType = 'HIGHER';
        contingentName = team.contingent.higherInstitution?.name || 'Unknown Institution';
      } else if (team.contingent.independentId) {
        contingentType = 'INDEPENDENT';
        contingentName = team.contingent.independent?.name || 'Independent Group';
      }

      return {
        ...team,
        contingent: {
          ...team.contingent,
          type: contingentType,
          name: contingentName,
        },
      };
    });

    return NextResponse.json(formattedTeams);
  } catch (error) {
    console.error("Error getting teams for event contest:", error);
    return NextResponse.json(
      { error: "Failed to get teams" },
      { status: 500 }
    );
  }
}

// POST /api/events/[id]/contests/[contestId]/teams
// Add a team to an event contest (used by contingent managers)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; contestId: string } }
) {
  try {
    // This endpoint would be used by contingent managers to register teams
    // It will be implemented in a separate task focused on contingent team registration
    
    return NextResponse.json(
      { error: "Not implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error adding team to event contest:", error);
    return NextResponse.json(
      { error: "Failed to add team" },
      { status: 500 }
    );
  }
}
