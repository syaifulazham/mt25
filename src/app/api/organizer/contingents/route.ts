import { NextResponse } from 'next/server';
import { getCurrentUser, hasRequiredRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Force dynamic rendering - required for routes that use cookies
export const dynamic = 'force-dynamic';

// GET /api/organizer/contingents
export async function GET(request: Request) {
  try {
    // Check authorization
    const user = await getCurrentUser();
    if (!user || !('role' in user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get URL parameters for filtering, sorting, etc.
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('search') || '';
    const schoolId = url.searchParams.get('schoolId') ? parseInt(url.searchParams.get('schoolId') || '0') : undefined;
    const higherInstId = url.searchParams.get('higherInstId') ? parseInt(url.searchParams.get('higherInstId') || '0') : undefined;
    const type = url.searchParams.get('type') || undefined;

    console.log('API: Getting contingents with filters:', {
      searchTerm,
      schoolId,
      higherInstId,
      type
    });

    // Build filter object
    const filter: any = {};

    if (schoolId) {
      filter.schoolId = schoolId;
    }

    if (higherInstId) {
      filter.higherInstId = higherInstId;
    }

    if (type) {
      filter.type = type;
    }

    if (searchTerm) {
      filter.OR = [
        { name: { contains: searchTerm } },
        { code: { contains: searchTerm } }
      ];
    }

    // Get contingents with school or higher institution info
    const contingents = await prisma.contingent.findMany({
      where: filter,
      include: {
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        higherinstitution: {
          select: {
            id: true,
            name: true,
          },
        },
        contest: {
          select: {
            id: true,
            name: true,
          },
        },
        managers: {
          select: {
            id: true,
          },
        },
        contestants: {
          select: {
            id: true,
          },
        },
        teams: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Format the response
    const formattedContingents = contingents.map(contingent => ({
      id: contingent.id,
      name: contingent.name,
      code: contingent.code,
      type: contingent.type,
      schoolId: contingent.schoolId,
      higherInstId: contingent.higherInstId,
      schoolName: contingent.school?.name,
      higherInstName: contingent.higherinstitution?.name,
      contestId: contingent.contestId,
      contestName: contingent.contest?.name,
      createdAt: contingent.createdAt,
      updatedAt: contingent.updatedAt,
      managerCount: contingent.managers.length,
      contestantCount: contingent.contestants.length,
      teamCount: contingent.teams.length,
    }));

    console.log(`API: Found ${formattedContingents.length} contingents`);
    return NextResponse.json(formattedContingents);
  } catch (error) {
    console.error('Error retrieving contingents:', error);
    // Return an empty array instead of an error to prevent UI breakage
    return NextResponse.json([]);
  }
}
