import { NextResponse } from 'next/server';
import { prismaExecute } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

// Force dynamic rendering to prevent static generation errors during build
export const dynamic = 'force-dynamic';

const CHUNK_SIZE = 100000; // 100k records per chunk

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has appropriate role
    if (!session?.user || !session.user.role || !['ADMIN', 'ORGANIZER', 'VIEWER'].includes(session.user.role)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized to view dashboard data' }),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const offsetParam = searchParams.get('offset');
    const offset = parseInt(offsetParam ?? '0');

    // Define a helper function to format state names
    const formatStateName = (stateName: string | null): string | null => {
      if (!stateName) return stateName;
      
      const upperStateName = stateName.toUpperCase();
      
      if (upperStateName.includes('NEGERI SEMBILAN')) return 'N9';
      if (upperStateName.includes('PULAU PINANG')) return 'P. PINANG';
      if (upperStateName.includes('KUALA LUMPUR')) return 'KUALA LUMPUR';
      if (upperStateName.includes('WILAYAH PERSEKUTUAN KUALA LUMPUR')) return 'WP KUALA LUMPUR';
      if (upperStateName.includes('WILAYAH PERSEKUTUAN')) return `WP ${upperStateName.replace('WILAYAH PERSEKUTUAN', '').trim()}`;
      
      return stateName;
    };

    // Get total count first
    if (action === 'count') {
      const totalCount = await prismaExecute(prisma => {
        return prisma.contestParticipation.count();
      });

      console.log(`Total contest participations: ${totalCount}`);
      
      return NextResponse.json({ 
        totalCount,
        chunkSize: CHUNK_SIZE,
        totalChunks: Math.ceil(totalCount / CHUNK_SIZE)
      });
    }

    // Process a chunk of data
    if (action === 'chunk') {
      console.log(`Processing chunk starting at offset ${offset} with chunk size ${CHUNK_SIZE}`);
      
      const participationData = await prismaExecute(prisma => {
        return prisma.contestParticipation.findMany({
          skip: offset,
          take: CHUNK_SIZE,
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

      console.log(`Retrieved ${participationData.length} contest participations for this chunk`);

      // Process the chunk data to aggregate by state and gender
      const stateGenderMap = new Map<string, { MALE: number; FEMALE: number }>();

      participationData.forEach(participation => {
        const contestant = participation.contestant;
        const contingent = contestant.contingent;
        
        let stateName = null;
        
        // Get state based on contingent type
        if (contingent.contingentType === 'SCHOOL' && contingent.school?.state) {
          stateName = contingent.school.state.name;
        } else if (contingent.contingentType === 'INDEPENDENT' && contingent.independent?.state) {
          stateName = contingent.independent.state.name;
        } else if (contingent.contingentType === 'HIGHER_INSTITUTION' && contingent.higherInstitution?.state) {
          stateName = contingent.higherInstitution.state.name;
        }
        
        if (stateName) {
          const formattedStateName = formatStateName(stateName);
          
          if (formattedStateName) {
            if (!stateGenderMap.has(formattedStateName)) {
              stateGenderMap.set(formattedStateName, { MALE: 0, FEMALE: 0 });
            }
            
            const stateData = stateGenderMap.get(formattedStateName)!;
            if (contestant.gender === 'MALE') {
              stateData.MALE++;
            } else if (contestant.gender === 'FEMALE') {
              stateData.FEMALE++;
            }
          }
        }
      });

      // Convert map to array format
      const chunkResult = Array.from(stateGenderMap.entries()).map(([state, counts]) => ({
        state,
        MALE: counts.MALE,
        FEMALE: counts.FEMALE
      }));

      return NextResponse.json({
        offset,
        processed: participationData.length,
        chunkData: chunkResult
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error processing participation states data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
