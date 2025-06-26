import { NextResponse } from 'next/server';
import { prismaExecute } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

export async function GET() {
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
  
  try {
    // Get gender distribution based on contest participations
    const genderParticipation = await prismaExecute(prisma => 
      prisma.$queryRaw`
        SELECT c.gender, COUNT(*) as count
        FROM contestParticipation cp
        JOIN contestant c ON cp.contestantId = c.id
        GROUP BY c.gender
      `
    ) as Array<{gender: string | null, count: bigint}>;
    
    // Format the data for the chart, converting bigint to number
    const genderDistributionData = genderParticipation.map(group => ({
      gender: group.gender || 'UNKNOWN',
      count: Number(group.count),
    }));
    
    console.log('Gender distribution data from participations:', genderDistributionData);
    
    return NextResponse.json(genderDistributionData);
  } catch (error) {
    console.error('Error accessing gender distribution data:', error);
    return NextResponse.json(
      { error: 'Failed to load gender distribution data' },
      { status: 500 }
    );
  }
}
