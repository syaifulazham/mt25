import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string; teamId: string } }
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
    const teamId = parseInt(params.teamId);
    
    if (isNaN(eventId) || isNaN(teamId)) {
      return NextResponse.json({ error: "Invalid event ID or team ID" }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['PENDING', 'CONDITIONAL', 'APPROVED', 'ACCEPTED', 'REJECTED', 'APPROVED_SPECIAL'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Update the team status in eventcontestteam
    const result = await prisma.$queryRaw`
      UPDATE eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      SET ect.status = ${status}
      WHERE ect.teamId = ${teamId} 
        AND ec.eventId = ${eventId}
    ` as any;

    return NextResponse.json({ 
      success: true, 
      message: `Team status updated to ${status}` 
    });
    
  } catch (error) {
    console.error("Error updating team status:", error);
    return NextResponse.json(
      { error: "Failed to update team status" },
      { status: 500 }
    );
  }
}
