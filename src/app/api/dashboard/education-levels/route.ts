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
    
    console.log('Fetching education levels by contest participation using raw query...');
    
    // Use raw SQL to get the data since Prisma groupBy has limitations with relations
    const results = await prismaExecute(async (prisma) => {
      const rawResults = await prisma.$queryRaw`
        SELECT 
          COALESCE(c.edu_level, 'UNKNOWN') as level, 
          COUNT(cp.id) as count
        FROM 
          contestParticipation cp
        JOIN 
          contestant c ON cp.contestantId = c.id
        GROUP BY 
          c.edu_level
        ORDER BY 
          count DESC
      `;
      
      return rawResults;
    });
    
    console.log(`Found ${results.length} education levels by participation`);
    
    // Format the data for the chart
    const educationLevelData = Array.isArray(results) ? 
      results.map(item => ({
        level: (item.level || 'Unknown').toUpperCase(), // Force uppercase
        count: Number(item.count) // Ensure count is a number
      })) : [];
    
    console.log('Education level data:', educationLevelData);
    
    return NextResponse.json(educationLevelData);
  } catch (error) {
    console.error('Error accessing education level data:', error);
    return NextResponse.json(
      { error: 'Failed to load education level data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
