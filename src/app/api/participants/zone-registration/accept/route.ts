import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";

const db = new PrismaClient();

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

    // Find the team to verify it exists and belongs to the user
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: {
        eventcontestteam: true,
        managers: {
          where: {
            participantId: Number(session.user.id)
          }
        }
      }
    });

    // Check if team exists and belongs to the user
    if (!team || team.managers.length === 0) {
      return NextResponse.json(
        { error: "Team not found or unauthorized" },
        { status: 404 }
      );
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
