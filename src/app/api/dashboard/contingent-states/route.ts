import { NextResponse } from 'next/server';
import { prismaExecute } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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
    // Query contingents and join related tables to get state information
    const contingentsWithState = await prismaExecute(prisma => {
      return prisma.contingent.findMany({
        include: {
          school: {
            include: {
              state: true
            }
          },
          higherInstitution: {
            include: {
              state: true
            }
          },
          independent: {
            include: {
              state: true
            }
          }
        }
      });
    });
    
    // Group contingents by state and count them
    const stateCountMap = new Map<string, number>();
    
    contingentsWithState.forEach(contingent => {
      // Get state name based on contingent type
      let stateName = null;
      if (contingent.school?.state) {
        stateName = contingent.school.state.name;
      } else if (contingent.higherInstitution?.state) {
        stateName = contingent.higherInstitution.state.name;
      } else if (contingent.independent?.state) {
        stateName = contingent.independent.state.name;
      }
      
      if (!stateName) return; // Skip if state name is empty
      
      const currentCount = stateCountMap.get(stateName) || 0;
      stateCountMap.set(stateName, currentCount + 1);
    });
    
    // Function to abbreviate long state names
    const formatStateName = (stateName: string): string => {
      if (!stateName) return stateName;
      
      const upperStateName = stateName.toUpperCase();
      
      if (upperStateName.includes('NEGERI SEMBILAN')) return 'N9';
      if (upperStateName.includes('PULAU PINANG')) return 'P. PINANG';
      if (upperStateName.includes('KUALA LUMPUR')) return 'KUALA LUMPUR';
      if (upperStateName.includes('WILAYAH PERSEKUTUAN KUALA LUMPUR')) return 'WP KUALA LUMPUR';
      if (upperStateName.includes('WILAYAH PERSEKUTUAN')) return `WP ${upperStateName.replace('WILAYAH PERSEKUTUAN', '').trim()}`;
      
      return stateName;
    };
    
    // Convert the map to the required array format with formatted state names
    const contingentStateData = Array.from(stateCountMap.entries())
      .map(([state, count]) => ({ state: formatStateName(state), count }))
      .sort((a, b) => b.count - a.count); // Sort by count in descending order
    
    return NextResponse.json(contingentStateData);
  } catch (error) {
    console.error('Error accessing contingent data by state:', error);
    return NextResponse.json(
      { error: 'Failed to load contingent state data' },
      { status: 500 }
    );
  }
}
