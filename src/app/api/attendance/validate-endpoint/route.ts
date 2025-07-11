import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Mark this route as dynamic to fix the build error
export const dynamic = 'force-dynamic';

// GET handler to validate if an attendance endpoint exists
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');
    const endpointhash = url.searchParams.get('endpointhash');
    
    // Validate required parameters
    if (!eventId || !endpointhash) {
      return NextResponse.json(
        { error: "Missing required parameters: eventId and endpointhash" },
        { status: 400 }
      );
    }

    const parsedEventId = parseInt(eventId as string);
    if (isNaN(parsedEventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Check if the endpoint exists
    const endpoint = await prisma.attendance_endpoint.findFirst({
      where: {
        eventId: parsedEventId,
        endpointhash: endpointhash as string
      },
    });

    if (!endpoint) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    return NextResponse.json({ 
      exists: true,
      eventId: endpoint.eventId,
      endpointhash: endpoint.endpointhash
    }, { status: 200 });
  } catch (error) {
    console.error("Error validating attendance endpoint:", error);
    return NextResponse.json(
      { error: "Failed to validate attendance endpoint" },
      { status: 500 }
    );
  }
}
