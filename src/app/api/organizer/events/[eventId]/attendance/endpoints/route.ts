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

// GET handler to fetch all attendance endpoints for an event
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

    // Fetch all attendance endpoints for the event
    const endpoints = await prisma.attendance_endpoint.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ endpoints });
  } catch (error) {
    console.error("Error fetching attendance endpoints:", error);
    return NextResponse.json({ error: "Failed to fetch attendance endpoints" }, { status: 500 });
  }
}

// POST handler to create a new attendance endpoint
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

    // Check if the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Generate a unique hash and passcode
    const endpointhash = nanoid(10); // 10 character unique hash
    const passcode = generatePasscode(6); // 6 character alphanumeric passcode

    // Create the new attendance endpoint
    const newEndpoint = await prisma.attendance_endpoint.create({
      data: {
        eventId,
        endpointhash,
        passcode,
      },
    });

    return NextResponse.json({ endpoint: newEndpoint }, { status: 201 });
  } catch (error) {
    console.error("Error creating attendance endpoint:", error);
    return NextResponse.json({ error: "Failed to create attendance endpoint" }, { status: 500 });
  }
}

// DELETE handler to remove an attendance endpoint
export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // Get the endpoint ID from the URL query parameters
    const url = new URL(req.url);
    const endpointId = url.searchParams.get("id");
    
    if (!endpointId) {
      return NextResponse.json({ error: "Endpoint ID is required" }, { status: 400 });
    }

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

    // Delete the attendance endpoint
    await prisma.attendance_endpoint.delete({
      where: {
        id: parseInt(endpointId),
        eventId, // Ensure the endpoint belongs to the specified event
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attendance endpoint:", error);
    return NextResponse.json({ error: "Failed to delete attendance endpoint" }, { status: 500 });
  }
}
