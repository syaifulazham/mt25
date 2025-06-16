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
    console.log(`PATCH request for event contest: Event ID ${params.id}, Contest ID ${params.contestId}`);
    
    // Check if user is authenticated and has required role
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse the event ID and contest ID parameters
    const eventId = parseInt(params.id);
    const contestIdParam = parseInt(params.contestId);
    console.log(`Parsed IDs: Event ID ${eventId}, Contest ID param ${contestIdParam}`);

    if (isNaN(eventId) || isNaN(contestIdParam)) {
      return NextResponse.json(
        { error: 'Invalid ID parameters' },
        { status: 400 }
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
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // There could be confusion in how IDs are being used
    // The contestId parameter might be eventcontest.id instead of contest.id
    try {
      console.log('===== DEBUG: PATCH EVENT CONTEST =====');
      console.log(`Looking for event-contest with eventId=${eventId} and contestId=${contestIdParam}`);
      
      // First, try with a more direct query to check if the record exists
      const directQuery = `
        SELECT ec.id, ec.eventId, ec.contestId, e.name as eventName, c.name as contestName 
        FROM eventcontest ec
        JOIN event e ON ec.eventId = e.id
        JOIN contest c ON ec.contestId = c.id
        WHERE ec.eventId = ? AND ec.contestId = ?
      `;
      
      const directMatches = await prisma.$queryRawUnsafe(directQuery, eventId, contestIdParam);
      console.log('Direct matches (eventId AND contestId):', JSON.stringify(directMatches, null, 2));
      
      // Now try the broader query to see what other records might be matching partially
      const listQuery = `
        SELECT ec.id, ec.eventId, ec.contestId, e.name as eventName, c.name as contestName 
        FROM eventcontest ec
        JOIN event e ON ec.eventId = e.id
        JOIN contest c ON ec.contestId = c.id
        WHERE ec.eventId = ? OR ec.id = ? OR ec.contestId = ?
      `;
      
      const eventContests = await prisma.$queryRawUnsafe(listQuery, eventId, contestIdParam, contestIdParam);
      console.log('Available event contests (broader search):', JSON.stringify(eventContests, null, 2));
      
      // Try to find the event contest by different combinations of IDs
      let targetEventContest: any = null;
      let foundById = false;
      
      if (Array.isArray(eventContests)) {
        // First try exact match of eventId and contestId
        targetEventContest = eventContests.find((ec: any) => 
          ec.eventId === eventId && ec.contestId === contestIdParam);
        
        // If not found, try to find by eventcontestId (the id might be passed as contestId)
        if (!targetEventContest) {
          const byId = eventContests.find((ec: any) => ec.id === contestIdParam);
          if (byId) {
            targetEventContest = byId;
            foundById = true;
            console.log(`Found event contest by its ID: ${contestIdParam}`);
          }
        }
      }
      
      if (!targetEventContest) {
        console.error(`Event contest not found for event ${eventId} and contest ${contestIdParam}`);
        return NextResponse.json(
          { 
            error: 'Event contest not found', 
            requestParams: { eventId, contestId: contestIdParam },
            availableEventContests: eventContests 
          },
          { status: 404 }
        );
      }
      
      console.log(`Found event contest:`, JSON.stringify(targetEventContest, null, 2));
      
      // Extract the validated data
      const data = validationResult.data;
      
      // Build update query parameters
      const updateParts = [];
      const params = [];
      
      if (data.maxteampercontingent !== undefined) {
        updateParts.push('maxteampercontingent = ?');
        params.push(data.maxteampercontingent);
      }
      
      if (data.person_incharge !== undefined) {
        updateParts.push('person_incharge = ?');
        params.push(data.person_incharge);
      }
      
      if (data.person_incharge_phone !== undefined) {
        updateParts.push('person_incharge_phone = ?');
        params.push(data.person_incharge_phone);
      }
      
      if (data.isActive !== undefined) {
        updateParts.push('isActive = ?');
        params.push(data.isActive);
      }
      
      // Always update the timestamp
      updateParts.push('updatedAt = NOW()');
      
      // No fields to update
      if (updateParts.length === 1) { // Only the timestamp
        return NextResponse.json({ message: 'No fields to update' });
      }
      
      // Add the ID parameter for the WHERE clause
      params.push(targetEventContest.id);
      
      // Construct and execute the update query
      const updateQuery = `
        UPDATE eventcontest 
        SET ${updateParts.join(', ')} 
        WHERE id = ?
      `;
      
      await prisma.$queryRawUnsafe(updateQuery, ...params);
      console.log(`Updated event contest ID ${targetEventContest.id}`);
      
      // Fetch the updated record
      const fetchQuery = `
        SELECT ec.*, e.name as eventName, c.name as contestName 
        FROM eventcontest ec
        JOIN event e ON ec.eventId = e.id
        JOIN contest c ON ec.contestId = c.id
        WHERE ec.id = ?
      `;
      
      const updatedResult = await prisma.$queryRawUnsafe(fetchQuery, targetEventContest.id);
      const updatedRecord = Array.isArray(updatedResult) && updatedResult.length > 0 ? 
        updatedResult[0] : null;
      
      return NextResponse.json(updatedRecord);
    } catch (dbError: any) {
      console.error('Database error updating event contest:', dbError);
      return NextResponse.json(
        { error: `Database error: ${dbError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('General error in PATCH handler:', error);
    return NextResponse.json(
      { error: `Failed to update event contest: ${error?.message || 'Unknown error'}` },
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
