import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { Prisma } from "@prisma/client";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Authenticate the request
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check if user has appropriate role to access data
  const userRole = session.user.role;
  if (!userRole || !['ADMIN', 'ORGANIZER', 'VIEWER'].includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }
  
  try {
    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const stateId = searchParams.get('stateId');
    const stateIdInt = stateId ? parseInt(stateId) : null;

    console.log(`Processing gender distribution request${stateIdInt ? ` for stateId: ${stateIdInt}` : ''}`);

    // Handle state filtering - we'll use a simpler approach with a direct query
    let genderDistribution;
    
    if (stateIdInt) {
      console.log(`Getting gender distribution for state ID: ${stateIdInt}`);
      
      // Direct query combining all contingent types in one go
      genderDistribution = await prisma.$queryRaw<{ gender: string; count: bigint }[]>`
        SELECT 
          c.gender, 
          COUNT(cp.id) as count
        FROM 
          contestParticipation cp
        JOIN
          contestant c ON cp.contestantId = c.id
        JOIN
          contingent cont ON c.contingentId = cont.id
        LEFT JOIN
          school s ON cont.schoolId = s.id
        LEFT JOIN
          higherinstitution h ON cont.higherInstId = h.id
        LEFT JOIN
          independent i ON cont.independentId = i.id
        WHERE 
          (cont.contingentType = 'SCHOOL' AND s.stateId = ${stateIdInt}) OR
          (cont.contingentType = 'HIGHER_INSTITUTION' AND h.stateId = ${stateIdInt}) OR
          (cont.contingentType = 'INDEPENDENT' AND i.stateId = ${stateIdInt})
        GROUP BY 
          c.gender
      `;
    } else {
      // Without state filter - simpler query
      genderDistribution = await prisma.$queryRaw<{ gender: string; count: bigint }[]>`
        SELECT 
          c.gender, 
          COUNT(cp.id) as count
        FROM 
          contestParticipation cp
        JOIN
          contestant c ON cp.contestantId = c.id
        GROUP BY 
          c.gender
      `;
    }
    
    // Handle empty results
    if (!genderDistribution || !Array.isArray(genderDistribution)) {
      console.log('Query returned no results or invalid data');
      return NextResponse.json([]);
    }
    
    // Format the results and ensure BigInt is converted to Number
    const genderDistributionData = genderDistribution.map(entry => ({
      gender: entry.gender || 'UNKNOWN',
      count: Number(entry.count || 0)
    }));
    
    console.log('Gender distribution data:', genderDistributionData);
    
    return NextResponse.json(genderDistributionData);
  } catch (error) {
    console.error('Error accessing gender distribution data:', error);
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
        error: 'Failed to load gender distribution data', 
        details: errorMessage 
      }),
      { status: 500 }
    );
  }
}
