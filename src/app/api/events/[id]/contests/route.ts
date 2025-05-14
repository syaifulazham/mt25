import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { hasRequiredRole } from '@/lib/auth';
import { z } from 'zod';

// Mark this route as dynamic since it uses getCurrentUser() which uses headers()
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * GET /api/events/[id]/contests
 * Get all contests for a specific event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = parseInt(params.id);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get all event contests for this event
    const eventContests = await prisma.eventcontest.findMany({
      where: { eventId },
      include: {
        contest: {
          include: {
            targetgroup: true,
            theme: true,
          }
        },
        teams: {
          include: {
            contingent: true,
            members: {
              include: {
                contestant: true
              }
            }
          }
        },
        judges: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(eventContests);
  } catch (error) {
    console.error('Error fetching event contests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event contests' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/contests
 * Add contests to an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated and has required role
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const eventId = parseInt(params.id);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Define validation schema for request body
    const addContestsSchema = z.object({
      contestIds: z.array(z.number()).min(1, "At least one contest must be selected"),
      maxteampercontingent: z.number().min(1).default(1),
      person_incharge: z.string().optional(),
      person_incharge_phone: z.string().optional(),
    });

    // Parse and validate request body
    const body = await request.json();
    const validationResult = addContestsSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { contestIds, maxteampercontingent, person_incharge, person_incharge_phone } = validationResult.data;

    // Check if all contests exist
    const contests = await prisma.contest.findMany({
      where: { id: { in: contestIds } }
    });

    if (contests.length !== contestIds.length) {
      return NextResponse.json(
        { error: 'One or more contests not found' },
        { status: 404 }
      );
    }

    // Check for existing event contests to avoid duplicates
    const existingEventContests = await prisma.eventcontest.findMany({
      where: {
        eventId,
        contestId: { in: contestIds }
      },
      select: { contestId: true }
    });

    const existingContestIds = existingEventContests.map(ec => ec.contestId);
    const newContestIds = contestIds.filter(id => !existingContestIds.includes(id));

    if (newContestIds.length === 0) {
      return NextResponse.json(
        { error: 'All selected contests are already added to this event' },
        { status: 400 }
      );
    }

    // Create event contests
    const eventContests = await prisma.$transaction(
      newContestIds.map(contestId => 
        prisma.eventcontest.create({
          data: {
            eventId,
            contestId,
            maxteampercontingent,
            person_incharge,
            person_incharge_phone,
          },
          include: {
            contest: true
          }
        })
      )
    );

    return NextResponse.json({
      message: `${eventContests.length} contests added to event successfully`,
      eventContests
    });
  } catch (error) {
    console.error('Error adding contests to event:', error);
    return NextResponse.json(
      { error: 'Failed to add contests to event' },
      { status: 500 }
    );
  }
}
