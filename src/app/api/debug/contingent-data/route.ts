import { NextRequest, NextResponse } from 'next/server';
import { prismaExecute } from '@/lib/prisma';
import { debugLog } from '@/app/organizer/events/stats/_utils/debug-log';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const zoneId = parseInt(searchParams.get('zoneId') || '0', 10);
  
  console.log('Debug API called with zoneId:', zoneId);
  
  if (!zoneId) {
    console.log('Invalid zoneId provided');
    return NextResponse.json({ error: 'Missing or invalid zoneId' }, { status: 400 });
  }
  
  try {
    console.log('Starting to check if any data exists for this zone...');
    // First, check if any data exists for this zone at all
    console.log('Checking if any data exists for this zone...');
    const zoneExists = await prismaExecute((prisma) => prisma.zone.findUnique({
      where: { id: zoneId }
    }));
    
    // Count states in this zone
    const statesCount = await prismaExecute((prisma) => prisma.state.count({
      where: { zoneId }
    }));
    
    console.log('Zone exists:', zoneExists ? true : false);
    console.log(`Zone ${zoneId} has ${statesCount} states`);
    
    console.log('Starting to fetch school contingents with relaxed filters...');
    // Get school contingents with relaxed filters
    const rawSchoolContingents = await prismaExecute((prisma) => prisma.contingent.findMany({
      where: {
        contingentType: "SCHOOL",
        school: {
          state: {
            zoneId
          }
        },
        teams: {
          some: {
            eventcontestteam: {
              some: {}
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        contingentType: true,
        schoolId: true,
        school: {
          select: {
            id: true,
            name: true,
            stateId: true,
            state: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    }));
    console.log(`Found ${rawSchoolContingents.length} school contingents`);
    
    // Get independent contingents with relaxed filters
    console.log('Starting to fetch independent contingents with relaxed filters...');
    const rawIndependentContingents = await prismaExecute((prisma) => prisma.contingent.findMany({
      where: {
        contingentType: "INDEPENDENT",
        independent: {
          state: {
            zoneId
          }
        }
        // Removed the teams filter to see if ANY contingents exist
      },
      select: {
        id: true,
        name: true,
        contingentType: true,
        independentId: true,
        independent: {
          select: {
            id: true,
            name: true,
            stateId: true,
            state: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    }));
    console.log(`Found ${rawIndependentContingents.length} independent contingents`);
    
    // Get all contingent IDs to use as filter
    const contingentIds = [
      ...rawSchoolContingents.map(c => c.id),
      ...rawIndependentContingents.map(c => c.id)
    ];
    console.log(`Total combined contingent IDs: ${contingentIds.length}`);
    
    // Get teams with relaxed filters
    console.log('Starting to fetch teams with relaxed filters...');
    const rawTeams = await prismaExecute((prisma) => prisma.team.findMany({
      where: {
        // Only teams from the contingents we found above
        contingentId: {
          in: contingentIds
        }
        // Removed eventcontestteam filter to see ALL teams
      },
      select: {
        id: true,
        contingentId: true,
        members: {
          select: {
            contestantId: true
          }
        },
        eventcontestteam: {
          select: {
            id: true,
            eventcontestId: true,
            eventcontest: {
              select: {
                id: true,
                eventId: true,
                contest: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    targetgroup: {
                      select: {
                        schoolLevel: true
                      }
                    }
                  }
                },
                event: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    }));
    console.log(`Found ${rawTeams.length} teams`);
    
    // Get ALL eventcontestteams in the system to check if they exist at all
    console.log('Starting to fetch ANY eventcontestteams in the system...');
    const anyEventContestTeams = await prismaExecute((prisma) => prisma.eventcontestteam.count());
    console.log(`Total eventcontestteams in the entire system: ${anyEventContestTeams}`);
    
    // Get eventcontestteams for this zone with relaxed filters
    console.log('Starting to fetch eventcontestteams for this zone...');
    const eventcontestteams = await prismaExecute((prisma) => prisma.eventcontestteam.findMany({
      where: {
        team: {
          contingent: {
            OR: [
              {
                contingentType: "SCHOOL",
                school: {
                  state: {
                    zoneId
                  }
                }
              },
              {
                contingentType: "INDEPENDENT",
                independent: {
                  state: {
                    zoneId
                  }
                }
              }
            ]
          }
        }
      },
      take: 50, // Limit to 50 records just in case there are many
      select: {
        id: true,
        teamId: true,
        team: {
          select: {
            contingentId: true,
            contingent: {
              select: {
                contingentType: true,
                school: {
                  select: {
                    stateId: true,
                    state: {
                      select: {
                        name: true,
                        zoneId: true,
                        zone: {
                          select: {
                            name: true
                          }
                        }
                      }
                    }
                  }
                },
                independent: {
                  select: {
                    stateId: true,
                    state: {
                      select: {
                        name: true,
                        zoneId: true,
                        zone: {
                          select: {
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
        }
      }
    }));
    console.log(`Found ${eventcontestteams.length} eventcontestteams`);
    
    // Process the data like in zone-statistics.ts but simplified for debugging
    // Group teams by state
    console.log('Starting to process data...');
    const stateTeamCounts = new Map<number, number>();
    
    // Count teams by state
    for (const team of rawTeams) {
      // Find contingent and get its state ID
      let stateId: number | undefined;
      const contingentId = team.contingentId;
      
      // Find matching contingent by ID
      const schoolContingent = rawSchoolContingents.find(c => c.id === contingentId);
      if (schoolContingent && schoolContingent.school) {
        stateId = schoolContingent.school.stateId;
      } else {
        const independentContingent = rawIndependentContingents.find(c => c.id === contingentId);
        if (independentContingent && independentContingent.independent) {
          stateId = independentContingent.independent.stateId;
        }
      }
      
      if (stateId) {
        stateTeamCounts.set(stateId, (stateTeamCounts.get(stateId) || 0) + 1);
      }
    }
    
    // Convert to array for display
    const processedStateGroups = Array.from(stateTeamCounts.entries()).map(([stateId, count]) => {
      // Find state name
      let stateName = "Unknown";
      for (const contingent of rawSchoolContingents) {
        if (contingent.school && contingent.school.stateId === stateId) {
          stateName = contingent.school.state?.name || "Unknown";
          break;
        }
      }
      
      if (stateName === "Unknown") {
        for (const contingent of rawIndependentContingents) {
          if (contingent.independent && contingent.independent.stateId === stateId) {
            stateName = contingent.independent.state?.name || "Unknown";
            break;
          }
        }
      }
      
      return { stateId, stateName, teamCount: count };
    }).sort((a, b) => a.stateName.localeCompare(b.stateName));
    
    // Check for potential mock data by examining if data exists in the state-stats-table
    // but not in our database queries
    console.log('Checking for potential mock data...');
    
    const mockDataAnalysis = {
      eventcontestteamsExist: anyEventContestTeams > 0,
      zoneHasContingents: (rawSchoolContingents.length + rawIndependentContingents.length) > 0,
      zoneHasTeams: rawTeams.length > 0,
      zoneHasEventContestTeams: eventcontestteams.length > 0,
      conclustion: ''
    };
    
    if (anyEventContestTeams === 0 && processedStateGroups.length === 0) {
      mockDataAnalysis.conclustion = 'No event contest teams exist in the system. The UI data is likely simulated/mock data.'; 
    } else if (anyEventContestTeams > 0 && eventcontestteams.length === 0) {
      mockDataAnalysis.conclustion = 'Event contest teams exist in the system but not for this zone. The UI data for this zone is likely simulated/mock data.';  
    }
    
    const result = {
      rawSchoolContingents,
      rawIndependentContingents,
      rawTeams,
      eventcontestteams,
      processedStateGroups,
      mockDataAnalysis
    };
    
    console.log('Final result prepared:', {
      schoolContingentsCount: rawSchoolContingents.length,
      independentContingentsCount: rawIndependentContingents.length,
      teamsCount: rawTeams.length,
      eventcontestteamsCount: eventcontestteams.length,
      stateGroupsCount: processedStateGroups.length,
      mockDataAnalysis
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in contingent-data debug route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
