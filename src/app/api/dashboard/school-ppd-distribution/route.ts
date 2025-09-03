import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Get the session using Next Auth
  try {
    const session = await getServerSession(authOptions);
    
    // If not authenticated or without proper role, return 401
    if (!session?.user || !session.user.role || !['ADMIN', 'ORGANIZER', 'VIEWER'].includes(session.user.role)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized to view dashboard data' }),
        { status: 401 }
      );
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const stateId = searchParams.get('stateId');

    // Fetch contingents by PPD for the specified state
    const stateIdInt = stateId ? parseInt(stateId) : null;
    console.log(`Processing school PPD distribution request${stateIdInt ? ` for stateId: ${stateIdInt}` : ''}`);
    
    let schoolContingentsByPpd;
    
    if (stateIdInt) {
      // With state filter
      schoolContingentsByPpd = await prisma.$queryRaw<{ ppd: string; count: bigint }[]>`
        SELECT 
          school.ppd as ppd, 
          COUNT(cp.id) as count
        FROM 
          contestParticipation as cp
        JOIN 
          contestant as c ON cp.contestantId = c.id
        JOIN 
          contingent as contingent ON c.contingentId = contingent.id
        JOIN 
          school as school ON contingent.schoolId = school.id
        WHERE 
          contingent.contingentType = 'SCHOOL'
          AND school.stateId = ${stateIdInt}
          AND school.ppd IS NOT NULL
        GROUP BY 
          school.ppd
        ORDER BY 
          count DESC
      `;
    } else {
      // Without state filter
      schoolContingentsByPpd = await prisma.$queryRaw<{ ppd: string; count: bigint }[]>`
        SELECT 
          school.ppd as ppd, 
          COUNT(cp.id) as count
        FROM 
          contestParticipation as cp
        JOIN 
          contestant as c ON cp.contestantId = c.id
        JOIN 
          contingent as contingent ON c.contingentId = contingent.id
        JOIN 
          school as school ON contingent.schoolId = school.id
        WHERE 
          contingent.contingentType = 'SCHOOL'
          AND school.ppd IS NOT NULL
        GROUP BY 
          school.ppd
        ORDER BY 
          count DESC
      `;
    }

    // Convert BigInt to Number for JSON serialization
    const formattedData = Array.isArray(schoolContingentsByPpd) 
      ? schoolContingentsByPpd.map(item => ({
          ppd: item.ppd,
          count: Number(item.count)
        }))
      : [];
        
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching school PPD distribution:', error);
    
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
        error: 'Failed to fetch school PPD distribution data',
        details: errorMessage 
      }),
      { status: 500 }
    );
  }
}
