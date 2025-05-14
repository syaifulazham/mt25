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
 * GET /api/events/[id]/contests/[contestId]
 * Get details of a specific contest in an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; contestId: string } }
) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = parseInt(params.id);
    const contestId = parseInt(params.contestId);

    if (isNaN(eventId) || isNaN(contestId)) {
      return NextResponse.json(
        { error: 'Invalid ID parameters' },
        { status: 400 }
      );
    }

    // Get the event contest
    const eventContest = await prisma.eventcontest.findUnique({
      where: {
        eventId_contestId: {
          eventId,
          contestId
        }
      },
      include: {
        event: true,
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
      }
    });

    if (!eventContest) {
      return NextResponse.json(
        { error: 'Event contest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(eventContest);
  } catch (error) {
    console.error('Error fetching event contest:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event contest' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[id]/contests/[contestId]
 * Update a specific contest in an event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; contestId: string } }
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
    const contestId = parseInt(params.contestId);

    if (isNaN(eventId) || isNaN(contestId)) {
      return NextResponse.json(
        { error: 'Invalid ID parameters' },
        { status: 400 }
      );
    }

    // Check if event contest exists
    const existingEventContest = await prisma.eventcontest.findUnique({
      where: {
        eventId_contestId: {
          eventId,
          contestId
        }
      }
    });

    if (!existingEventContest) {
      return NextResponse.json(
        { error: 'Event contest not found' },
        { status: 404 }
      );
    }

    // Define validation schema for request body
    const updateEventContestSchema = z.object({
      maxteampercontingent: z.number().min(1).optional(),
      person_incharge: z.string().optional().nullable(),
      person_incharge_phone: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
    });

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateEventContestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    // Update event contest
    const updatedEventContest = await prisma.eventcontest.update({
      where: {
        eventId_contestId: {
          eventId,
          contestId
        }
      },
      data: validationResult.data,
      include: {
        contest: true,
        event: true
      }
    });

    return NextResponse.json(updatedEventContest);
  } catch (error) {
    console.error('Error updating event contest:', error);
    return NextResponse.json(
      { error: 'Failed to update event contest' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]/contests/[contestId]
 * Remove a contest from an event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; contestId: string } }
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
    const contestId = parseInt(params.contestId);

    if (isNaN(eventId) || isNaN(contestId)) {
      return NextResponse.json(
        { error: 'Invalid ID parameters' },
        { status: 400 }
      );
    }

    // Check if event contest exists
    const existingEventContest = await prisma.eventcontest.findUnique({
      where: {
        eventId_contestId: {
          eventId,
          contestId
        }
      },
      include: {
        teams: true,
        judges: true
      }
    });

    if (!existingEventContest) {
      return NextResponse.json(
        { error: 'Event contest not found' },
        { status: 404 }
      );
    }

    // Check if there are associated teams or judges
    if (existingEventContest.teams.length > 0 || existingEventContest.judges.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete event contest with associated teams or judges',
          teamsCount: existingEventContest.teams.length,
          judgesCount: existingEventContest.judges.length
        },
        { status: 400 }
      );
    }

    // Delete event contest
    await prisma.eventcontest.delete({
      where: {
        eventId_contestId: {
          eventId,
          contestId
        }
      }
    });

    return NextResponse.json({
      message: 'Contest removed from event successfully'
    });
  } catch (error) {
    console.error('Error removing contest from event:', error);
    return NextResponse.json(
      { error: 'Failed to remove contest from event' },
      { status: 500 }
    );
  }
}
