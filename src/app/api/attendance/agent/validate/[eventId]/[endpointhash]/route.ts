import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET handler to validate agent endpoint
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string; endpointhash: string } }
) {
  try {
    const eventId = parseInt(params.eventId as string);
    const endpointhash = params.endpointhash as string;

    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    if (!endpointhash) {
      return NextResponse.json({ error: "Invalid endpoint hash" }, { status: 400 });
    }

    // Check if the agent endpoint exists
    const agentEndpoint = await prisma.attendanceagent_endpoint.findFirst({
      where: {
        eventId: eventId,
        endpointhash: endpointhash
      }
    });

    if (!agentEndpoint) {
      return NextResponse.json({
        eventId,
        endpointhash,
        exists: false,
        error: "Agent endpoint not found"
      }, { status: 404 });
    }

    // Get the event details separately
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        name: true,
        startDate: true,
        endDate: true
      }
    });

    if (!event) {
      return NextResponse.json({
        eventId,
        endpointhash,
        exists: false,
        error: "Event not found"
      }, { status: 404 });
    }

    // Check if current time is within allowed window (2 hours before event start to event end)
    const now = new Date();
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    const allowedStart = new Date(eventStart.getTime() - 2 * 60 * 60 * 1000); // 2 hours before

    const isWithinTimeWindow = now >= allowedStart && now <= eventEnd;

    return NextResponse.json({
      eventId,
      endpointhash,
      exists: true,
      eventName: event.name,
      isWithinTimeWindow,
      timeWindow: {
        start: allowedStart.toISOString(),
        end: eventEnd.toISOString()
      }
    });

  } catch (error) {
    console.error("Error validating agent endpoint:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      eventId: params.eventId,
      endpointhash: params.endpointhash
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
