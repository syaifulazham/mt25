import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { event } from "@prisma/client";

// Add export config to mark this route as dynamic
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: "Missing eventId parameter" },
        { status: 400 }
      );
    }

    // Convert eventId to number
    const eventIdNum = parseInt(eventId);
    
    // Try to read the event with full details
    console.log(`Attempting to read event ${eventIdNum}`);
    
    // Using standard Prisma query
    const prismaEvent = await prisma.event.findUnique({
      where: { id: eventIdNum },
    });

    if (!prismaEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Also fetch the same event using a raw query to get all fields including status
    const rawEvents = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM event WHERE id = ${eventIdNum}
    `;
    const rawEvent = rawEvents[0];
    
    // Create a combined event object with all fields
    const event = {
      ...prismaEvent,
      status: rawEvent.status // Add status from raw query
    };

    // Log the entire event structure to help diagnose
    console.log("Event data structure:", JSON.stringify(event, null, 2));
    
    // Return detailed information about the event
    return NextResponse.json({
      message: "Event data retrieved",
      event: {
        ...event,
        hasStatus: 'status' in event,
        statusValue: (event as any).status || 'Not found',
        keys: Object.keys(event),
      }
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      { 
        error: `Debug endpoint error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    );
  }
}
