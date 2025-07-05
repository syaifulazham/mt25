import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const status = searchParams.get('status');

    if (!eventId || !status) {
      return NextResponse.json(
        { error: "Missing eventId or status parameters" },
        { status: 400 }
      );
    }

    // Convert eventId to number
    const eventIdNum = parseInt(eventId);
    
    // Verify status is valid
    if (!["OPEN", "CLOSED", "CUTOFF_REGISTRATION"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Get user session
    const user = await getSessionUser();
    if (!user || !user.role || !["ADMIN", "OPERATOR"].includes(user.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get existing event first to check if it exists
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventIdNum },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Approach 1: Direct Update using Prisma client
    try {
      console.log(`Attempt 1: Updating event ${eventIdNum} to status: ${status}`);
      
      // Set explicit data object
      const data = { status: status };
      
      // Update the event
      const updatedEvent1 = await prisma.event.update({
        where: { id: eventIdNum },
        data,
      });
      
      console.log("Update 1 succeeded:", updatedEvent1);
    } catch (error1) {
      console.error("Update approach 1 failed:", error1);
    }

    // Approach 2: Use raw SQL
    try {
      console.log(`Attempt 2: Updating event ${eventIdNum} to status: ${status}`);
      
      const result2 = await prisma.$executeRaw`
        UPDATE "event" SET status = ${status} WHERE id = ${eventIdNum}
      `;
      
      console.log("Update 2 succeeded, affected rows:", result2);
    } catch (error2) {
      console.error("Update approach 2 failed:", error2);
    }

    // Approach 3: Use executeRawUnsafe
    try {
      console.log(`Attempt 3: Updating event ${eventIdNum} to status: ${status}`);
      
      const result3 = await prisma.$executeRawUnsafe(
        `UPDATE "event" SET status = ? WHERE id = ?`,
        status,
        eventIdNum
      );
      
      console.log("Update 3 succeeded, affected rows:", result3);
    } catch (error3) {
      console.error("Update approach 3 failed:", error3);
    }
    
    // Get the final event state
    const finalEvent = await prisma.event.findUnique({
      where: { id: eventIdNum },
    });
    
    return NextResponse.json({
      message: "Test endpoint executed",
      initialStatus: existingEvent.status,
      currentStatus: finalEvent?.status,
      eventId: eventIdNum
    });
  } catch (error) {
    console.error("Error in test-status-update:", error);
    return NextResponse.json(
      { error: `Test endpoint error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
