import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

// DELETE handler to remove an attendance agent endpoint
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    // Authenticate user and check for ADMIN or OPERATOR role
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = session.user;
    if (!['ADMIN', 'OPERATOR'].includes(role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const eventId = parseInt(params.eventId as string);
    const endpointId = parseInt(params.id as string);

    if (isNaN(eventId) || isNaN(endpointId)) {
      return NextResponse.json({ error: "Invalid event ID or endpoint ID" }, { status: 400 });
    }

    // Check if the endpoint exists and belongs to the specified event
    const existingEndpoint = await prisma.attendanceagent_endpoint.findFirst({
      where: {
        id: endpointId,
        eventId: eventId,
      },
    });

    if (!existingEndpoint) {
      return NextResponse.json({ error: "Attendance agent endpoint not found" }, { status: 404 });
    }

    // Delete the attendance agent endpoint
    await prisma.attendanceagent_endpoint.delete({
      where: { id: endpointId },
    });

    return NextResponse.json({ 
      message: "Attendance agent endpoint deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting attendance agent endpoint:", error);
    return NextResponse.json({ error: "Failed to delete attendance agent endpoint" }, { status: 500 });
  }
}
