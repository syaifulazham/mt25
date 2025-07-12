import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

// DELETE handler to remove an attendance endpoint
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
    if (!['ADMIN', 'OPERATOR'].includes(role as string)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const eventId = parseInt(params.eventId);
    const endpointId = parseInt(params.id);

    if (isNaN(eventId) || isNaN(endpointId)) {
      return NextResponse.json({ error: "Invalid ID parameters" }, { status: 400 });
    }

    // Verify the endpoint exists and belongs to this event
    const endpoint = await prisma.attendance_endpoint.findFirst({
      where: { 
        id: endpointId,
        eventId: eventId
      },
    });

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint not found or does not belong to this event" }, { status: 404 });
    }

    // Delete the endpoint
    await prisma.attendance_endpoint.delete({
      where: { id: endpointId },
    });

    return NextResponse.json({ message: "Endpoint deleted successfully" });
  } catch (error) {
    console.error("Error deleting attendance endpoint:", error);
    return NextResponse.json({ error: "Failed to delete attendance endpoint" }, { status: 500 });
  }
}
