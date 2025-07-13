import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST handler to validate agent passcode
export async function POST(req: NextRequest) {
  try {
    const { eventId, endpointhash, passcode } = await req.json();

    if (!eventId || !endpointhash || !passcode) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, endpointhash, passcode" },
        { status: 400 }
      );
    }

    const eventIdInt = parseInt(eventId);
    if (isNaN(eventIdInt)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Find the agent endpoint and validate passcode
    const agentEndpoint = await prisma.attendanceagent_endpoint.findFirst({
      where: {
        eventId: eventIdInt,
        endpointhash: endpointhash
      }
    });

    if (!agentEndpoint) {
      return NextResponse.json(
        { error: "Agent endpoint not found" },
        { status: 404 }
      );
    }

    // Validate passcode
    if (agentEndpoint.passcode !== passcode) {
      return NextResponse.json(
        { error: "Invalid passcode" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Passcode validated successfully"
    });

  } catch (error) {
    console.error("Error validating agent passcode:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      eventId,
      endpointhash,
      passcode: passcode ? '[REDACTED]' : 'undefined'
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
