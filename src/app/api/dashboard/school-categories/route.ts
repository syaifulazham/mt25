import { NextResponse } from 'next/server';
import { prismaExecute } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

// Force dynamic rendering to prevent static generation errors during build
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Authenticate the request
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has appropriate role to access data
    const userRole = session.user.role;
    if (!userRole || (userRole !== 'ADMIN' && userRole !== 'VIEWER')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }
    
    console.log('Fetching school categories by contest participation using raw query...');

    // Use raw SQL to get school categories with participation counts
    const results = await prismaExecute(async (prisma) => {
      const rawResults = await prisma.$queryRaw`
        SELECT 
          s.category, 
          COUNT(cp.id) as count
        FROM 
          contestParticipation cp
        JOIN 
          contestant cnt ON cp.contestantId = cnt.id
        JOIN 
          contingent ctg ON cnt.contingentId = ctg.id
        JOIN 
          school s ON ctg.schoolId = s.id
        WHERE 
          ctg.contingentType = 'SCHOOL'
          AND s.category IS NOT NULL
        GROUP BY 
          s.category
        ORDER BY 
          count DESC
      `;
      
      return rawResults;
    });
    
    console.log(`Found ${results.length} school categories by participation`);
    
    // Format the data for the chart
    const schoolCategoryData = Array.isArray(results) ? 
      results.map(item => ({
        category: item.category || 'Unknown',
        count: Number(item.count) // Ensure count is a number
      })) : [];
    
    console.log('School category data:', schoolCategoryData);
    
    return NextResponse.json(schoolCategoryData);
  } catch (error) {
    console.error('Error accessing school category data:', error);
    return NextResponse.json(
      { error: 'Failed to load school category data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
