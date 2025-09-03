import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    
    // Check authorization
    if (!session?.user || !session.user.role || !['ADMIN', 'ORGANIZER', 'VIEWER'].includes(session.user.role)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized to view dashboard data' }),
        { status: 401 }
      );
    }
    
    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const stateId = searchParams.get('stateId');
    const stateIdInt = stateId ? parseInt(stateId) : null;
    
    console.log(`Processing school category distribution request${stateIdInt ? ` for stateId: ${stateIdInt}` : ''}`);
    
    // Execute the appropriate query based on stateId presence
    let schoolCategoryData;
    
    if (stateIdInt) {
      console.log(`Processing school category distribution for state ${stateIdInt} using contest participations`);
      // For state-specific queries, we'll count contest participations by school category
      
      // With state filter - get school categories with contest participation counts
      schoolCategoryData = await prisma.$queryRaw<{ category: string; count: bigint }[]>`
        SELECT
          s.category AS category,
          COUNT(cp.id) AS count
        FROM
          contestParticipation cp
        JOIN
          contestant cnt ON cp.contestantId = cnt.id
        JOIN
          contingent c ON cnt.contingentId = c.id
        JOIN
          School s ON c.schoolId = s.id
        WHERE
          c.contingentType = 'SCHOOL'
          AND s.stateId = ${stateIdInt}
          AND s.category IS NOT NULL
        GROUP BY
          s.category
        ORDER BY
          count DESC;
      `;
    } else {
      // Without state filter
      schoolCategoryData = await prisma.$queryRaw<{ category: string; count: bigint }[]>`
        SELECT
          s.category AS category,
          COUNT(cp.id) AS count
        FROM
          contestParticipation cp
        JOIN
          contestant cnt ON cp.contestantId = cnt.id
        JOIN
          contingent c ON cnt.contingentId = c.id
        JOIN
          School s ON c.schoolId = s.id
        WHERE
          c.contingentType = 'SCHOOL'
          AND s.category IS NOT NULL
        GROUP BY
          s.category
        ORDER BY
          count DESC;
      `;
    }
    
    // Format the results to convert BigInt to numbers
    const formattedData = Array.isArray(schoolCategoryData) 
      ? schoolCategoryData.map(item => ({
          category: item.category,
          count: Number(item.count)
        }))
      : [];
    
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching school category distribution:', error);
    // Log the full error details including stack trace
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    
    // Return detailed error message including stack trace for debugging
    const errorMessage = error instanceof Error 
      ? `${error.message}\nStack: ${error.stack}` 
      : String(error);
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to fetch school category distribution',
        details: errorMessage 
      }),
      { status: 500 }
    );
  }
}
