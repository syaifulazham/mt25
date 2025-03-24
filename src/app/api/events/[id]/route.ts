import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { hasRequiredRole } from '@/lib/auth';
import { z } from 'zod';

/**
 * GET /api/events/[id]
 * Get a specific event by ID
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

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    // Get event by ID
    const event = await prisma.event.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        contests: {
          include: {
            targetgroup: true,
            theme: true,
          }
        }
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[id]
 * Update an existing event
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

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Define event validation schema
    const eventUpdateSchema = z.object({
      name: z.string().min(3).optional(),
      code: z.string().min(2).optional(),
      description: z.string().nullable().optional(),
      startDate: z.string().or(z.date()).optional(),
      endDate: z.string().or(z.date()).optional(),
      venue: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      addressState: z.string().nullable().optional(),
      scopeArea: z.enum(['NATIONAL', 'ZONE', 'STATE', 'OPEN']).optional(),
      zoneId: z.number().nullable().optional(),
      stateId: z.number().nullable().optional(),
      latitude: z.number().or(z.string()).nullable().optional(),
      longitude: z.number().or(z.string()).nullable().optional(),
      isActive: z.boolean().optional(),
    });

    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const result = eventUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.issues },
        { status: 400 }
      );
    }

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id: parseInt(params.id) },
      data: {
        name: body.name,
        code: body.code,
        description: body.description,
        startDate: body.startDate,
        endDate: body.endDate,
        venue: body.venue,
        address: body.address,
        city: body.city,
        addressState: body.addressState,
        scopeArea: body.scopeArea,
        zoneId: body.zoneId,
        stateId: body.stateId,
        latitude: body.latitude,
        longitude: body.longitude,
        isActive: body.isActive,
      },
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 * Delete an event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated and has required role
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        contests: true,
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if event has associated contests
    if (existingEvent.contests.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete event with associated contests' },
        { status: 400 }
      );
    }

    // Delete event
    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: 'Event deleted successfully' }
    );
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
