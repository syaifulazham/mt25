import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { nanoid } from 'nanoid';

// Helper function to generate a random alphanumeric passcode
function generatePasscode(length = 6): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let passcode = '';
  for (let i = 0; i < length; i++) {
    passcode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return passcode;
}

// GET handler to fetch all attendance agent endpoints for an event
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
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
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Fetch all attendance agent endpoints for the event
    const endpoints = await prisma.attendanceagent_endpoint.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ endpoints });
  } catch (error) {
    console.error("Error fetching attendance agent endpoints:", error);
    return NextResponse.json({ error: "Failed to fetch attendance agent endpoints" }, { status: 500 });
  }
}

// POST handler to create a new attendance agent endpoint
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
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
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Verify that the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Generate unique endpoint hash and passcode
    const endpointhash = nanoid(10);
    const passcode = generatePasscode();

    // Create new attendance agent endpoint
    const newEndpoint = await prisma.attendanceagent_endpoint.create({
      data: {
        eventId,
        endpointhash,
        passcode,
      },
    });

    return NextResponse.json({ 
      endpoint: newEndpoint,
      message: "Attendance agent endpoint created successfully" 
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating attendance agent endpoint:", error);
    return NextResponse.json({ error: "Failed to create attendance agent endpoint" }, { status: 500 });
  }
}
