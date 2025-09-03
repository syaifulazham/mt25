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
    
    console.log(`Processing education level distribution request${stateIdInt ? ` for stateId: ${stateIdInt}` : ''}`);
    
    // Execute the appropriate query based on stateId presence
    let educationData;
    
    if (stateIdInt) {
      // Step 1: Find all contingent IDs that belong to the specified state
      let contingentIds: number[] = [];
      
      // Get school contingent IDs for this state
      const schoolContingents = await prisma.contingent.findMany({
        where: {
          contingentType: 'SCHOOL',
          school: {
            stateId: stateIdInt
          }
        },
        select: { id: true }
      });
      
      // Get higher institution contingent IDs for this state
      const higherInstContingents = await prisma.contingent.findMany({
        where: {
          contingentType: 'HIGHER_INSTITUTION',
          higherInstitution: {
            stateId: stateIdInt
          }
        },
        select: { id: true }
      });
      
      // Get independent contingent IDs for this state
      const independentContingents = await prisma.contingent.findMany({
        where: {
          contingentType: 'INDEPENDENT',
          independent: {
            stateId: stateIdInt
          }
        },
        select: { id: true }
      });
      
      // Combine all contingent IDs
      contingentIds = [
        ...schoolContingents.map(c => c.id),
        ...higherInstContingents.map(c => c.id),
        ...independentContingents.map(c => c.id)
      ];
      
      console.log(`Found ${contingentIds.length} contingents for state ${stateIdInt}`);
      
      // If no contingents found for this state, return empty result early
      if (contingentIds.length === 0) {
        console.log(`No contingents found for state ${stateIdInt}, returning empty result`);
        return NextResponse.json([]);
      }
      
      // Step 2: With state filter - get education levels with contest participation counts
      educationData = await prisma.$queryRaw`
        WITH education_data AS (
          SELECT
            c.edu_level,
            COUNT(cp.id) as count
          FROM
            contestParticipation cp
          JOIN
            contestant c ON cp.contestantId = c.id
          WHERE
            c.contingentId IN (${Prisma.join(contingentIds)})
            AND c.edu_level IS NOT NULL
          GROUP BY
            c.edu_level
        )
        SELECT
          COALESCE(edu_level, 'UNKNOWN') AS educationLevel,
          count
        FROM
          education_data
        ORDER BY
          count DESC;
      `;
    } else {
      // Without state filter
      educationData = await prisma.$queryRaw`
        WITH education_data AS (
          SELECT
            c.edu_level,
            COUNT(cp.id) as count
          FROM
            contestParticipation cp
          JOIN
            contestant c ON cp.contestantId = c.id
          WHERE
            c.edu_level IS NOT NULL
          GROUP BY
            c.edu_level
        )
        SELECT
          COALESCE(edu_level, 'UNKNOWN') AS educationLevel,
          count
        FROM
          education_data
        ORDER BY
          count DESC;
      `;
    }
    
    // Format the results to convert BigInt to numbers
    const formattedData = Array.isArray(educationData) 
      ? educationData.map(item => ({
          educationLevel: item.educationLevel,
          count: Number(item.count)
        }))
      : [];
    
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching education level distribution:', error);
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
        error: 'Failed to fetch education level distribution', 
        details: errorMessage 
      }),
      { status: 500 }
    );
  }
}
