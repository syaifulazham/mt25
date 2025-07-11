import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST handler to verify a passcode for an attendance endpoint
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, endpointhash, passcode } = body;
    
    // Validate required parameters
    if (!eventId || !endpointhash || !passcode) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const parsedEventId = parseInt(eventId);
    if (isNaN(parsedEventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Check if the endpoint exists and verify the passcode
    const endpoint = await prisma.attendance_endpoint.findFirst({
      where: {
        eventId: parsedEventId,
        endpointhash: endpointhash
      },
    });

    if (!endpoint) {
      return NextResponse.json(
        { valid: false, error: "Endpoint not found" },
        { status: 200 }
      );
    }

    // Compare the provided passcode with the stored one
    const isValid = endpoint.passcode === passcode;

    return NextResponse.json({ valid: isValid }, { status: 200 });
  } catch (error) {
    console.error("Error verifying passcode:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to verify passcode" },
      { status: 500 }
    );
  }
}
