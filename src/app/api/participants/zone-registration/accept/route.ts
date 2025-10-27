import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";

const db = new PrismaClient();

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get teamId from request body
    const { teamId } = await req.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Find the team first to get its contingent ID
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: {
        eventcontestteam: true
      }
    });

    // Check if team exists
    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }
    
    // Check if the user is a manager for the team's contingent
    const contingentManager = await db.contingentManager.findFirst({
      where: {
        participantId: Number(session.user.id),
        contingentId: team.contingentId
      }
    });
    
    // If the user isn't a manager for this contingent, check if they're a direct manager of the team
    if (!contingentManager) {
      const directManager = await db.teamManager.findFirst({
        where: {
          teamId: teamId,
          participantId: Number(session.user.id)
        }
      });
      
      if (!directManager) {
        return NextResponse.json(
          { error: "Unauthorized: You are not a manager for this team or its contingent" },
          { status: 403 }
        );
      }
    }

    // Check if there's an eventcontestteam entry
    if (!team.eventcontestteam || team.eventcontestteam.length === 0) {
      return NextResponse.json(
        { error: "Team is not registered for any zone event" },
        { status: 400 }
      );
    }

    // Update the status to ACCEPTED
    const updatedEventContestTeam = await db.eventcontestteam.update({
      where: {
        id: team.eventcontestteam[0].id
      },
      data: {
        status: "ACCEPTED"
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedEventContestTeam
    });
    
  } catch (error) {
    console.error("Error accepting registration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
