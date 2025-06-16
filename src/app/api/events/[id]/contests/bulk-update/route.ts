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
 * PATCH /api/events/[id]/contests/bulk-update
 * Bulk update all contests for a specific event
 */
export async function PATCH(
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

    // Parse the event ID
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
    const bulkUpdateSchema = z.object({
      maxteampercontingent: z.number().min(1),
    });

    // Parse and validate request body
    const body = await request.json();
    const validationResult = bulkUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { maxteampercontingent } = validationResult.data;

    // Update all event contests for this event
    const updateResult = await prisma.eventcontest.updateMany({
      where: { eventId },
      data: { 
        maxteampercontingent,
        updatedAt: new Date()
      }
    });

    // Get the updated event contests to return
    const updatedEventContests = await prisma.eventcontest.findMany({
      where: { eventId },
      include: {
        contest: {
          include: {
            targetgroup: true,
            theme: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      message: `Updated max team per contingent for ${updateResult.count} contests`,
      updatedCount: updateResult.count,
      eventContests: updatedEventContests
    });
  } catch (error) {
    console.error('Error bulk updating event contests:', error);
    return NextResponse.json(
      { error: 'Failed to update event contests' },
      { status: 500 }
    );
  }
}
