import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

/**
 * GET /api/events
 * Get all events with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const addressState = searchParams.get('addressState');

    // Build filter conditions
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (activeOnly) {
      where.isActive = true;
    }
    
    if (addressState) {
      where.addressState = addressState;
    }

    // Get events with filtering
    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        contests: true,
        zone: true,
        state: true,
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Create a new event
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and has required role
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'OPERATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Define event validation schema
    const eventSchema = z.object({
      name: z.string().min(3),
      code: z.string().min(2),
      description: z.string().optional().nullable(),
      startDate: z.string().or(z.date()),
      endDate: z.string().or(z.date()),
      venue: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      addressState: z.string().optional().nullable(),
      scopeArea: z.enum(['NATIONAL', 'ZONE', 'STATE', 'OPEN', 'DISTRICT', 'ONLINE_NATIONAL', 'ONLINE_ZONE', 'ONLINE_STATE', 'ONLINE_OPEN']).default('OPEN'),
      zoneId: z.number().optional().nullable(),
      stateId: z.number().optional().nullable(),
      latitude: z.number().or(z.string()).optional().nullable(),
      longitude: z.number().or(z.string()).optional().nullable(),
      isActive: z.boolean().default(true),
    });

    // Parse request body
    const body = await request.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));
    
    // Validate request body
    const result = eventSchema.safeParse(body);
    if (!result.success) {
      console.log('Validation failed:', result.error.issues);
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.issues },
        { status: 400 }
      );
    }
    
    console.log('Validation passed, scopeArea value:', body.scopeArea);

    // Handle zone and state IDs based on scope area (same logic as PATCH route)
    let processedZoneId = body.zoneId !== null && body.zoneId !== undefined ? body.zoneId : null;
    let processedStateId = body.stateId !== null && body.stateId !== undefined ? body.stateId : null;
    
    // Special case: If 'Online State' selected and 'National' selected as 'State',
    // then stateId shall save as NULL (open to all states)
    // Check for both string "national" and numeric 0 (which represents "National" selection)
    if (body.scopeArea === 'ONLINE_STATE' && (body.stateId === 'national' || body.stateId === 0)) {
      processedStateId = null;
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        name: body.name,
        code: body.code,
        description: body.description,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        venue: body.venue,
        address: body.address,
        city: body.city,
        addressState: body.addressState,
        scopeArea: body.scopeArea,
        zoneId: processedZoneId,
        stateId: processedStateId,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        isActive: body.isActive ?? true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An event with this code already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
