import { NextRequest, NextResponse } from 'next/server';
import { prismaExecute } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';

export async function GET(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    // If not authenticated or not ADMIN, return 401/403
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get search query from URL params
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query || query.length < 2) {
      return NextResponse.json([], { status: 200 });
    }

    // Search schools with prisma
    const schools = await prismaExecute(async (prisma) => {
      // Create a case-insensitive search by using multiple OR conditions
      return await prisma.school.findMany({
        where: {
          OR: [
            { name: { contains: query.toLowerCase() } },
            { name: { contains: query.toUpperCase() } },
            { name: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          state: true,
          ppd: true,
          category: true,
        },
        orderBy: {
          name: 'asc',
        },
        take: 50, // Limit results to 50 schools
      });
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error('Error searching schools:', error);
    return NextResponse.json(
      { message: 'Failed to search schools' },
      { status: 500 }
    );
  }
}
