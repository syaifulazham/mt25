import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // Authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the eventId from params
    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Execute SQL query to get distinct states with teams in this event
    // Using the sql suggested: 'select distinct stateId, state from attetndanceTeam where eventId = 15'
    // Note: Fixed typo in table name from "attetndanceTeam" to "attendanceTeam"
    const participatingStates = await prisma.$queryRaw`
      SELECT DISTINCT 
        s.id, 
        s.name 
      FROM attendanceTeam at
      JOIN team t ON at.teamId = t.id
      JOIN contingent c ON t.contingentId = c.id
      JOIN state s ON c.stateId = s.id
      WHERE at.eventId = ${eventId}
      ORDER BY s.name ASC
    `;

    // Log the results
    console.log(`Found ${(participatingStates as any[]).length} participating states for event ${eventId}`);

    return NextResponse.json(participatingStates);
  } catch (error) {
    console.error("Error fetching participating states:", error);
    return NextResponse.json(
      { error: "Failed to fetch participating states" },
      { status: 500 }
    );
  }
}
