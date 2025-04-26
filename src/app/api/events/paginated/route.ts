import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

/**
 * GET /api/events/paginated
 * Get paginated events with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const addressState = searchParams.get('addressState') || '';
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const scopeArea = searchParams.get('scopeArea') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // Validate pagination parameters
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: 'Invalid page number' },
        { status: 400 }
      );
    }

    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'Invalid page size' },
        { status: 400 }
      );
    }

    // Calculate pagination values
    const skip = (page - 1) * pageSize;

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
      where.addressState = { contains: addressState, mode: 'insensitive' };
    }
    
    if (scopeArea) {
      where.scopeArea = { contains: scopeArea, mode: 'insensitive' };
    }

    // Get paginated events with filtering
    const [events, totalCount] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startDate: 'desc' },
        include: {
          contests: true,
          zone: true,
          state: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.event.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      data: events,
      meta: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error('Error fetching paginated events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
