import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

// POST /api/organizer/teams/[id]/join-event
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has required role (ADMIN or OPERATOR)
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OPERATOR') {
      return NextResponse.json(
        { error: "You do not have permission to register teams for events" },
        { status: 403 }
      );
    }

    const teamId = parseInt(params.id);
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
    }

    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        contest: true
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if the contest is part of this event
    const eventContest = await prisma.eventcontest.findFirst({
      where: {
        eventId: eventId,
        contestId: team.contestId
      }
    });

    if (!eventContest) {
      return NextResponse.json(
        { error: 'This team\'s contest is not part of the selected event' },
        { status: 400 }
      );
    }

    // Check if team is already registered for this event contest
    const existingRegistration = await prisma.eventcontestteam.findFirst({
      where: {
        teamId: teamId,
        eventcontestId: eventContest.id
      }
    });

    if (existingRegistration) {
      return NextResponse.json(
        { error: 'Team is already registered for this event' },
        { status: 400 }
      );
    }

    // Register the team for the event
    const registration = await prisma.eventcontestteam.create({
      data: {
        teamId: teamId,
        eventcontestId: eventContest.id
      }
    });

    return NextResponse.json({
      message: 'Team registered for event successfully',
      registration
    });

  } catch (error) {
    console.error("Error registering team for event:", error);
    return NextResponse.json(
      { error: "Failed to register team for event" },
      { status: 500 }
    );
  }
}
