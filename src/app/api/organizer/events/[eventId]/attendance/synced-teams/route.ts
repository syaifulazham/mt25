import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// API to get the list of team IDs that have been synced to attendanceTeam
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is an organizer admin or operator
    if (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Get all team IDs that have been synced to attendanceTeam for this event
    const syncedTeams = await prisma.$queryRaw`
      SELECT DISTINCT teamId FROM attendanceTeam 
      WHERE eventId = ${eventId}
    ` as any[];
    
    // Extract just the teamId values
    const syncedTeamIds = syncedTeams.map(item => Number(item.teamId));

    return NextResponse.json({
      success: true,
      syncedTeamIds,
      count: syncedTeamIds.length
    });
  } catch (error) {
    console.error("Error fetching synced team IDs:", error);
    return NextResponse.json(
      { error: "Failed to fetch synced team data" },
      { status: 500 }
    );
  }
}
