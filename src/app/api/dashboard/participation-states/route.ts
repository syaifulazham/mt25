import { NextResponse } from 'next/server';
import { prismaExecute } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

// Force dynamic rendering to prevent static generation errors during build
export const dynamic = 'force-dynamic';

export async function GET() {
  // Authenticate the request
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has appropriate role
    if (!session?.user || !['ADMIN', 'ORGANIZER', 'VIEWER'].includes(session.user.role)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized to view dashboard data' }),
        { status: 401 }
      );
    }
    
    // Define a helper function to format state names
    const formatStateName = (stateName) => {
      if (!stateName) return stateName;
      
      const upperStateName = stateName.toUpperCase();
      
      if (upperStateName.includes('NEGERI SEMBILAN')) return 'N9';
      if (upperStateName.includes('PULAU PINANG')) return 'P. PINANG';
      if (upperStateName.includes('KUALA LUMPUR')) return 'KUALA LUMPUR';
      if (upperStateName.includes('WILAYAH PERSEKUTUAN KUALA LUMPUR')) return 'WP KUALA LUMPUR';
      if (upperStateName.includes('WILAYAH PERSEKUTUAN')) return `WP ${upperStateName.replace('WILAYAH PERSEKUTUAN', '').trim()}`;
      
      return stateName;
    };

    // Start with contestParticipation and follow the correct join path as per user instructions
    // contestParticipation --> contestant --> contingent --> (school|independent) --> state
    const participationData = await prismaExecute(prisma => {
      return prisma.contestParticipation.findMany({
        select: {
          contestant: {
            select: {
              id: true,
              gender: true,
              contingent: {
                select: {
                  id: true,
                  contingentType: true,
                  school: {
                    select: {
                      id: true,
                      name: true,
                      state: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  },
                  independent: {
                    select: {
                      id: true,
                      name: true,
                      state: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  },
                  higherInstitution: {
                    select: {
                      id: true,
                      name: true,
                      state: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    });
    
    console.log(`Retrieved ${participationData.length} contest participations`);

    // Extract and count all unique states from the database for comparison
    const allStateNames = await prismaExecute(prisma => {
      return prisma.state.findMany({
        select: {
          name: true
        }
      });
    });
    
    console.log(`Database has ${allStateNames.length} states:`, allStateNames.map(state => state.name).join(', '));
    
    // Group the data by state and count by gender
    const stateGenderMap = new Map<string, { MALE: number, FEMALE: number }>();

    // Process each participation record
    for (const participation of participationData) {
      const contestant = participation.contestant;
      if (!contestant || !contestant.contingent) continue;
      
      // Get the contestant's gender
      const gender = contestant.gender;
      if (gender !== 'MALE' && gender !== 'FEMALE') continue;
      
      // Get the state based on contingent type
      let stateName = "Unknown";
      const contingent = contestant.contingent;
      const contingentType = contingent.contingentType;
      
      if (contingentType === 'SCHOOL' && contingent.school?.state?.name) {
        stateName = contingent.school.state.name;
      } else if (contingentType === 'HIGHER_INSTITUTION' && contingent.higherInstitution?.state?.name) {
        stateName = contingent.higherInstitution.state.name;
      } else if (contingentType === 'INDEPENDENT' && contingent.independent?.state?.name) {
        stateName = contingent.independent.state.name;
      }
      
      // Skip Unknown states (optional - for debugging we include them)
      // if (stateName === "Unknown") continue;
      
      // For debugging: log potentially problematic records
      if (stateName === "Unknown") {
        console.log('Found participation with unknown state:', {
          contestantId: contestant.id,
          hasContingent: !!contingent,
          contingentType,
          hasSchool: !!contingent.school,
          hasHigherInst: !!contingent.higherInstitution,
          hasIndependent: !!contingent.independent
        });
      }
      
      // Format the state name
      const formattedStateName = formatStateName(stateName);
      
      // Get current counts or initialize
      const currentCounts = stateGenderMap.get(formattedStateName) || { MALE: 0, FEMALE: 0 };
      
      // Increment the count for this gender
      // Each participation record counts as 1 participation
      currentCounts[gender] += 1;
      
      // Update the map
      stateGenderMap.set(formattedStateName, currentCounts);
    }
    
    // Count unique states for debugging
    const uniqueStates = Array.from(stateGenderMap.keys());
    console.log(`Found ${uniqueStates.length} unique states in data: ${uniqueStates.join(', ')}`);
    console.log(`States with Unknown removed: ${uniqueStates.filter(s => s !== "Unknown").join(', ')}`);

    // Convert to array format for the chart
    const participationStateData = Array.from(stateGenderMap.entries())
      .map(([state, counts]) => ({
        state,
        MALE: counts.MALE,
        FEMALE: counts.FEMALE
      }))
      .sort((a, b) => (b.MALE + b.FEMALE) - (a.MALE + a.FEMALE)); // Sort by total count
      
    console.log(`Final participation state data has ${participationStateData.length} states:`, 
      participationStateData.map(item => item.state).join(', '));
    console.log('Full participation state data:', JSON.stringify(participationStateData, null, 2));
    
    return NextResponse.json(participationStateData);
  } catch (error) {
    console.error('Error accessing participation data by state:', error);
    return NextResponse.json(
      { error: 'Failed to load participation state data' },
      { status: 500 }
    );
  }
}
