import { prismaExecute } from "@/lib/prisma";
import { cookies } from "next/headers";

// The API returns a direct array of team data, not an object with a teams property
type TeamsRawDataApiResponse = TeamRawDataItem[];

// Type for API response items
type TeamRawDataItem = {
  eventId: number;
  eventName: string;
  zoneId: number;
  zoneName: string;
  stateId: number;
  stateName: string;
  contestId: number;
  contestName: string;
  contestCode: string;
  contingentId: number;
  contingentName: string;
  contingentType: string;
  teamId: number;
  teamName: string;
  numberOfMembers: number;
  // New fields added to the API
  schoolLevel: string | null;
  independentType: string | null;
};

// Define types
export type ZoneData = {
  id: number;
  name: string;
};

export type StateData = {
  id: number;
  name: string;
  zone?: ZoneData | null;
};

export type StatsSummary = {
  schoolCount: number;
  teamCount: number;
  contestantCount: number;
  contingentCount: number; // Total contingents (SCHOOL + INDEPENDENT)
  independentCount: number; // Only INDEPENDENT contingents
  youthGroupCount: number; // Youth Group contingents (type of INDEPENDENT)
  parentCount: number; // Parent contingents (type of INDEPENDENT)
  primarySchoolCount: number; // Primary schools (schoolLevel = Rendah)
  secondarySchoolCount: number; // Secondary schools (schoolLevel = Menengah)
  schoolTeamsCount: number; // All school teams
  primarySchoolTeamsCount: number; // Primary school teams
  secondarySchoolTeamsCount: number; // Secondary school teams
};

export type ProcessedContingent = {
  id: number;
  displayName: string;
  contingentType: string;
  teamsCount: number;
  contestantsCount: number;
};

export type ContestGroup = {
  contestId: number;
  contestName: string;
  contestCode: string;
  contingents: ProcessedContingent[];
};

export type SchoolLevelGroup = {
  schoolLevel: string;
  contests: ContestGroup[];
};

export type TeamData = {
  id: number;
  contingentId: number;
  members: { contestantId: number }[];
  eventcontestteam: {
    eventcontestId: number;
    eventcontest: {
      id: number;
      contest: {
        id: number;
        name: string;
        code: string;
        targetgroup: {
          schoolLevel: string
        }[];
      };
      event: {
        name: string;
      };
    };
  }[];
};

export type ContingentData = {
  id: number;
  name: string;
  contingentType: string;
  school?: {
    name: string;
  } | null;
};

export type StateStatsResult = {
  zone: ZoneData | null;
  state: StateData | null;
  groupedData: SchoolLevelGroup[];
  summary: StatsSummary;
};

/**
 * Process team raw data from API to generate state statistics
 */
interface ProcessedTeamData {
  groupedData: SchoolLevelGroup[];
  uniqueTeamIds: Set<number>;
  uniqueContestantIds: Set<string>;
  uniqueSchoolIds: Set<number>;
  uniqueContingentIds: Set<number>;
  independentContingentIds: Set<number>;
  youthGroupContingentIds: Set<number>;
  parentContingentIds: Set<number>;
  primarySchoolIds: Set<number>;
  secondarySchoolIds: Set<number>;
  schoolTeamIds: Set<number>;
  primarySchoolTeamIds: Set<number>;
  secondarySchoolTeamIds: Set<number>;
}

function processTeamRawData(teamItems: TeamRawDataItem[] | undefined, stateId: number): ProcessedTeamData {
  // Data structures to track unique entities and organize results
  const schoolLevelGroups = new Map<string, SchoolLevelGroup>();
  const uniqueTeamIds = new Set<number>();
  const uniqueContestantIds = new Set<string>(); // Using string because we're creating synthetic IDs
  const uniqueSchoolIds = new Set<number>();
  const uniqueContingentIds = new Set<number>(); // Track ALL contingent types
  const independentContingentIds = new Set<number>(); // Track INDEPENDENT contingents
  const youthGroupContingentIds = new Set<number>(); // Track Youth Group contingents
  const parentContingentIds = new Set<number>(); // Track Parent contingents
  const primarySchoolIds = new Set<number>(); // Track Primary schools (schoolLevel = Rendah)
  const secondarySchoolIds = new Set<number>(); // Track Secondary schools (schoolLevel = Menengah)
  const schoolTeamIds = new Set<number>(); // Track School teams
  const primarySchoolTeamIds = new Set<number>(); // Track Primary school teams
  const secondarySchoolTeamIds = new Set<number>(); // Track Secondary school teams
  
  // Defensive check - if teamItems is undefined, return empty results
  if (!teamItems || !Array.isArray(teamItems)) {
    console.error('Invalid team data received in processTeamRawData:', teamItems);
    return {
      groupedData: [],
      uniqueTeamIds: new Set<number>(),
      uniqueContestantIds: new Set<string>(),
      uniqueSchoolIds: new Set<number>(),
      uniqueContingentIds: new Set<number>(),
      independentContingentIds: new Set<number>(),
      youthGroupContingentIds: new Set<number>(),
      parentContingentIds: new Set<number>(),
      primarySchoolIds: new Set<number>(),
      secondarySchoolIds: new Set<number>(),
      schoolTeamIds: new Set<number>(),
      primarySchoolTeamIds: new Set<number>(),
      secondarySchoolTeamIds: new Set<number>(),
    };
  }
  
  console.log('[processTeamRawData] Processing', teamItems.length, 'teams');
  
  // Filter teams to only include those from the specified state
  const stateTeams = teamItems.filter(team => {
    const matches = team.stateId === stateId;
    return matches;
  });
  console.log(`[processTeamRawData] Found ${stateTeams.length} teams for state ${stateId} out of ${teamItems.length} total teams`);
  
  // Track teams and members per contingent for summary stats
  const contingentTeams = new Map<number, Set<number>>();
  const contingentMembers = new Map<number, Set<string>>();
  
  // Process each team from API data
  for (const item of stateTeams) {
    // Skip teams with no members
    if (!item.numberOfMembers || item.numberOfMembers === 0) continue;
    
    // Add to tracking sets
    uniqueTeamIds.add(item.teamId);
    
    // Add ALL contingent types to uniqueContingentIds
    uniqueContingentIds.add(item.contingentId);
    
    if (item.contingentType === 'SCHOOL') {
      uniqueSchoolIds.add(item.contingentId);
      // Track school team
      schoolTeamIds.add(item.teamId);
      
      // Track school levels based on the schoolLevel field
      const schoolLevel = item.schoolLevel?.toLowerCase();
      if (schoolLevel === 'rendah' || schoolLevel === 'primary' || schoolLevel === 'sekolah rendah') {
        primarySchoolIds.add(item.contingentId);
        primarySchoolTeamIds.add(item.teamId); // Track primary school team
      } else if (schoolLevel === 'menengah' || schoolLevel === 'secondary' || schoolLevel === 'sekolah menengah') {
        secondarySchoolIds.add(item.contingentId);
        secondarySchoolTeamIds.add(item.teamId); // Track secondary school team
      }
    } else if (item.contingentType === 'INDEPENDENT') {
      independentContingentIds.add(item.contingentId);
      
      // Track independent contingent types using the new independentType field
      if (item.independentType === 'YOUTH_GROUP') {
        youthGroupContingentIds.add(item.contingentId);
      } else if (item.independentType === 'PARENT') {
        parentContingentIds.add(item.contingentId);
      }
    }
    
    // Track contingent team counts
    if (!contingentTeams.has(item.contingentId)) {
      contingentTeams.set(item.contingentId, new Set<number>());
    }
    contingentTeams.get(item.contingentId)!.add(item.teamId);
    
    // Track members per contingent (using synthetic IDs)
    if (!contingentMembers.has(item.contingentId)) {
      contingentMembers.set(item.contingentId, new Set<string>());
    }
    
    // Create synthetic contestant IDs for tracking
    for (let i = 0; i < item.numberOfMembers; i++) {
      const syntheticId = `team_${item.teamId}_member_${i}`;
      contingentMembers.get(item.contingentId)!.add(syntheticId);
      uniqueContestantIds.add(syntheticId);
    }
    
    // Determine school level from contest code/name or contingent type
    let schoolLevel = 'Uncategorized';
    
    // For INDEPENDENT contingents, put them in a separate category
    if (item.contingentType === 'INDEPENDENT') {
      schoolLevel = 'Independent';
    }
    // For SCHOOL contingents, determine level from contest info
    else if (item.contingentType === 'SCHOOL') {
      if (item.contestCode?.startsWith('P') || item.contestName.toLowerCase().includes('primary')) {
        schoolLevel = 'Primary';
      } else if (item.contestCode?.startsWith('S') || item.contestName.toLowerCase().includes('secondary')) {
        schoolLevel = 'Secondary';
      } else if (item.contestName.toLowerCase().includes('higher') || item.contestName.toLowerCase().includes('college')) {
        schoolLevel = 'Higher Education';
      }
    }
    
    // Create or get school level group
    let schoolLevelGroup = schoolLevelGroups.get(schoolLevel);
    if (!schoolLevelGroup) {
      schoolLevelGroup = {
        schoolLevel,
        contests: []
      };
      schoolLevelGroups.set(schoolLevel, schoolLevelGroup);
    }
    
    // Create or get contest group
    let contestGroup = schoolLevelGroup.contests.find(cg => cg.contestId === item.contestId);
    if (!contestGroup) {
      contestGroup = {
        contestId: item.contestId,
        contestName: item.contestName,
        contestCode: item.contestCode || item.contestName.substring(0, 3).toUpperCase(),
        contingents: []
      };
      schoolLevelGroup.contests.push(contestGroup);
    }
    
    // Create or get contingent entry
    let contingent = contestGroup.contingents.find(c => c.id === item.contingentId);
    if (!contingent) {
      const displayName = item.contingentName;
      contingent = {
        id: item.contingentId,
        displayName,
        contingentType: item.contingentType,
        teamsCount: 0,
        contestantsCount: 0
      };
      contestGroup.contingents.push(contingent);
    }
    
    // Update team and contestant counts for this contingent
    contingent.teamsCount = contingentTeams.get(item.contingentId)?.size || 0;
    contingent.contestantsCount = contingentMembers.get(item.contingentId)?.size || 0;
  }
  
  return {
    groupedData: Array.from(schoolLevelGroups.values()),
    uniqueTeamIds,
    uniqueContestantIds,
    uniqueSchoolIds,
    uniqueContingentIds,
    independentContingentIds,
    youthGroupContingentIds,
    parentContingentIds,
    primarySchoolIds,
    secondarySchoolIds,
    schoolTeamIds,
    primarySchoolTeamIds,
    secondarySchoolTeamIds
  };
}

// Function to get statistics for a specific state within a zone
export async function getStateStatistics(activeEvent: { id: number }, stateId: number): Promise<StateStatsResult> {
  console.log('[getStateStatistics] Started with:', { eventId: activeEvent.id, stateId });
  
  // Get zone and state info based on stateId
  const state = await prismaExecute<StateData | null>((prisma) => prisma.state.findUnique({
    where: { id: stateId },
    select: {
      id: true,
      name: true,
      zone: {
        select: {
          id: true,
          name: true
        }
      }
    }
  }));
  
  const zone = state?.zone || null;
  
  if (!zone || !state) {
    return { 
      zone: null, 
      state: null, 
      groupedData: [],
      summary: { 
        schoolCount: 0, 
        teamCount: 0, 
        contestantCount: 0, 
        contingentCount: 0, 
        independentCount: 0, 
        youthGroupCount: 0, 
        parentCount: 0, 
        primarySchoolCount: 0, 
        secondarySchoolCount: 0,
        schoolTeamsCount: 0,
        primarySchoolTeamsCount: 0,
        secondarySchoolTeamsCount: 0
      } 
    };
  }
  
  if (!activeEvent) {
    return { 
      zone, 
      state, 
      groupedData: [],
      summary: { 
        schoolCount: 0, 
        teamCount: 0, 
        contestantCount: 0, 
        contingentCount: 0, 
        independentCount: 0, 
        youthGroupCount: 0, 
        parentCount: 0, 
        primarySchoolCount: 0, 
        secondarySchoolCount: 0,
        schoolTeamsCount: 0,
        primarySchoolTeamsCount: 0,
        secondarySchoolTeamsCount: 0
      } as StatsSummary
    };
  }
  
  // DIRECT ACCESS TO DATABASE INSTEAD OF API CALL - Avoids authentication issues
  console.log('[getStateStatistics] Fetching team data directly from database for state:', stateId);
  
  try {
    // Fetch team data directly using Prisma instead of the API
    const teamData = await prismaExecute((prisma) => prisma.eventcontestteam.findMany({
      where: {
        // Apply filters
        eventcontest: {
          event: {
            scopeArea: 'ZONE', // Only include events with scopeArea = ZONE
            isActive: true,
          },
        },
        team: {
          OR: [
            { contingent: { school: { stateId } } },
            { contingent: { independent: { stateId } } },
            { contingent: { higherInstitution: { stateId } } }
          ],
        }
      },
      include: {
        eventcontest: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                zone: true,
              }
            },
            contest: {
              include: {
                targetgroup: true
              }
            },
          }
        },
        team: {
          include: {
            members: true,
            contingent: {
              include: {
                school: {
                  include: {
                    state: {
                      include: {
                        zone: true,
                      }
                    }
                  }
                },
                independent: {
                  include: {
                    state: {
                      include: {
                        zone: true,
                      }
                    }
                  }
                },
                higherInstitution: {
                  include: {
                    state: {
                      include: {
                        zone: true,
                      }
                    }
                  }
                },
              }
            }
          }
        }
      }
    }));
    
    console.log(`[getStateStatistics] Retrieved ${teamData.length} teams for state ${stateId}`);
    
    // Transform the data into the same format expected by processTeamRawData
    const transformedTeamItems: TeamRawDataItem[] = teamData
      .map(entry => {
        // Get state information based on contingent type
        let teamStateId, stateName, teamZoneId, zoneName, schoolLevel, independentType;
        const contingent = entry.team?.contingent;
        
        if (!entry.team || !contingent) {
          return null; // Skip if no team or contingent data
        }
        
        if (contingent.school) {
          teamStateId = contingent.school.stateId;
          stateName = contingent.school.state?.name;
          teamZoneId = contingent.school.state?.zoneId;
          zoneName = contingent.school.state?.zone?.name;
          schoolLevel = contingent.school.level;
        } else if (contingent.independent) {
          teamStateId = contingent.independent.stateId;
          stateName = contingent.independent.state?.name;
          teamZoneId = contingent.independent.state?.zoneId;
          zoneName = contingent.independent.state?.zone?.name;
          independentType = contingent.independent.type;
        } else if (contingent.higherInstitution) {
          teamStateId = contingent.higherInstitution.stateId;
          stateName = contingent.higherInstitution.state?.name;
          teamZoneId = contingent.higherInstitution.state?.zoneId;
          zoneName = contingent.higherInstitution.state?.zone?.name;
        }
        
        // Get the member count
        const numberOfMembers = entry.team.members?.length || 0;
        
        // Skip if this team has no members
        if (numberOfMembers === 0) {
          return null;
        }
        
        // Get contingent display name
        const contingentName = contingent.contingentType === 'SCHOOL' && contingent.school
          ? contingent.school.name
          : contingent.name;
          
        // Map contestLevel from targetgroup.schoolLevel
        // Default to 'Kids' since we know all contests should be Kids
        let contestLevel = 'Kids';
        
        if (entry.eventcontest?.contest?.targetgroup && entry.eventcontest.contest.targetgroup.length > 0) {
          const targetGroup = entry.eventcontest.contest.targetgroup[0];
          if (targetGroup.schoolLevel === 'Primary') {
            contestLevel = 'Kids';
          } else if (targetGroup.schoolLevel === 'Secondary') {
            contestLevel = 'Teens';
          } else if (targetGroup.schoolLevel === 'Higher Education') {
            contestLevel = 'Youth';
          }
        }

        return {
          eventId: entry.eventcontest.eventId,
          eventName: entry.eventcontest.event.name,
          zoneId: teamZoneId,
          zoneName,
          stateId: teamStateId,
          stateName,
          contestId: entry.eventcontest.contestId,
          contestName: entry.eventcontest.contest.name,
          contestCode: entry.eventcontest.contest.code,
          contingentId: entry.team.contingentId,
          contingentName,
          contingentType: contingent.contingentType,
          teamId: entry.teamId,
          teamName: entry.team.name,
          numberOfMembers,
          schoolLevel: schoolLevel || null,
          independentType: independentType || null,
          contestLevel: contestLevel
        };
      })
      .filter(Boolean) as TeamRawDataItem[]; // Remove null entries
    
    // Process the data using the transformed team items
    const processedData = processTeamRawData(transformedTeamItems, stateId);
    
    // Extract components from processedData
    const { 
      groupedData,
      uniqueTeamIds,
      uniqueContestantIds,
      uniqueSchoolIds,
      uniqueContingentIds,
      independentContingentIds,
      youthGroupContingentIds,
      parentContingentIds,
      primarySchoolIds,
      secondarySchoolIds,
      schoolTeamIds,
      primarySchoolTeamIds,
      secondarySchoolTeamIds
    } = processedData;
    
    // Create the summary object which is required by the return type
    const summary: StatsSummary = {
      schoolCount: uniqueSchoolIds.size,
      teamCount: uniqueTeamIds.size,
      contestantCount: uniqueContestantIds.size,
      contingentCount: uniqueContingentIds.size,
      independentCount: independentContingentIds.size,
      youthGroupCount: youthGroupContingentIds.size,
      parentCount: parentContingentIds.size,
      primarySchoolCount: primarySchoolIds.size,
      secondarySchoolCount: secondarySchoolIds.size,
      schoolTeamsCount: schoolTeamIds.size,
      primarySchoolTeamsCount: primarySchoolTeamIds.size,
      secondarySchoolTeamsCount: secondarySchoolTeamIds.size,
    };
    
    return {
      zone,
      state,
      groupedData,
      summary
    };
  } catch (error) {
    console.error('[getStateStatistics] Error fetching or processing team data:', error);
    // Return a valid structure with empty data instead of throwing
    return { 
      zone, 
      state, 
      groupedData: [],
      summary: { 
        schoolCount: 0, 
        teamCount: 0, 
        contestantCount: 0, 
        contingentCount: 0, 
        independentCount: 0, 
        youthGroupCount: 0, 
        parentCount: 0, 
        primarySchoolCount: 0, 
        secondarySchoolCount: 0,
        schoolTeamsCount: 0,
        primarySchoolTeamsCount: 0,
        secondarySchoolTeamsCount: 0
      } as StatsSummary
    };
  }

}
