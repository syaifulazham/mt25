import { NextResponse } from 'next/server';
import { prismaExecute } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'ORGANIZER', 'VIEWER'].includes(session.user.role)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized to view dashboard data' }),
        { status: 401 }
      );
    }
    
    // First, get contestants with contest participations
    const contestantsWithParticipations = await prismaExecute(prisma => {
      return prisma.contestant.findMany({
        where: {
          contests: {
            some: {} // Only contestants with at least one contest participation
          }
        },
        select: {
          id: true,
          gender: true,
          contingent: {
            select: {
              id: true,
              contingentType: true,
              school: {
                select: {
                  state: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              higherInstitution: {
                select: {
                  state: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              independent: {
                select: {
                  state: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });
    });
    
    console.log(`Found ${contestantsWithParticipations.length} contestants with contest participations`);
    
    // Count contestants by state using the contingentType
    const stateContestantCounts = {};
    let unknownStateCount = 0;
    
    // Process each contestant
    for (const contestant of contestantsWithParticipations) {
      let stateName = "Unknown";
      
      // Get state based on contingent type
      if (contestant.contingent) {
        if (contestant.contingent.contingentType === 'SCHOOL' && contestant.contingent.school?.state?.name) {
          stateName = contestant.contingent.school.state.name;
        } else if (contestant.contingent.contingentType === 'HIGHER_INSTITUTION' && contestant.contingent.higherInstitution?.state?.name) {
          stateName = contestant.contingent.higherInstitution.state.name;
        } else if (contestant.contingent.contingentType === 'INDEPENDENT' && contestant.contingent.independent?.state?.name) {
          stateName = contestant.contingent.independent.state.name;
        }
      }
      
      if (stateName === "Unknown") {
        unknownStateCount++;
      } else {
        stateContestantCounts[stateName] = (stateContestantCounts[stateName] || 0) + 1;
      }
    }
    
    // Get list of all states for comparison
    const allStates = await prismaExecute(prisma => {
      return prisma.state.findMany({
        select: {
          name: true
        }
      });
    });
    
    const stateNames = allStates.map(state => state.name);
    
    // Find states with no contestants
    const statesWithNoContestants = stateNames.filter(
      stateName => !Object.keys(stateContestantCounts).includes(stateName)
    );
    
    // Return the analysis
    return NextResponse.json({
      totalContestantsWithParticipations: contestantsWithParticipations.length,
      contestantsWithUnknownState: unknownStateCount,
      stateContestantCounts,
      statesWithContestants: Object.keys(stateContestantCounts).length,
      statesWithNoContestants,
      allStates: stateNames
    });
  } catch (error) {
    console.error('Error accessing participation state data:', error);
    return NextResponse.json(
      { error: 'Failed to load participation state debug data' },
      { status: 500 }
    );
  }
}
