import { prismaExecute } from "@/lib/prisma";

// Types for contest statistics
export type ContestData = {
  id: number;
  name: string;
  code: string;
  schoolLevel: string; // raw level from target group
  displayLevel: string; // formatted display label
};

export type TeamsByEduLevel = {
  [eduLevel: string]: number;
};

export type ContestStat = {
  contest: ContestData;
  contingentsCount: number;
  teamCount: number;
  teamsByEduLevel: TeamsByEduLevel;
};

// Group of contests by school level
export type SchoolLevelGroup = {
  schoolLevel: string; // raw level
  displayName: string; // formatted display name
  contests: ContestStat[];
};

export type ContestStatsResult = {
  groupedContests: SchoolLevelGroup[];
  summary: {
    totalContests: number;
    totalTeams: number;
    totalContingents: number;
  };
  stateId?: number;
  zoneId?: number;
};

/**
 * Map raw school level to display name
 */
function getDisplayNameForSchoolLevel(schoolLevel: string | null): string {
  switch (schoolLevel?.toUpperCase()) {
    case 'PRIMARY': 
      return 'Kids';
    case 'SECONDARY': 
      return 'Teens';
    case 'HIGHER EDUCATION':
      return 'Youth';
    default:
      return schoolLevel || 'Other';
  }
}

/**
 * Get statistics for all contests, optionally filtered by zone and/or state
 * @param zoneId Optional zone ID to filter by
 * @param stateId Optional state ID to filter by (more specific than zoneId)
 */
export async function getContestStatistics(zoneId?: number, stateId?: number): Promise<ContestStatsResult> {
  // Get all contests with their target groups - only including zone-level events
  const contests = await prismaExecute((prisma) => prisma.contest.findMany({
    include: {
      targetgroup: true,
      eventcontests: {
        where: {
          event: {
            scopeArea: 'ZONE'
          }
        },
        include: {
          event: true,
          eventcontestteam: {
            include: {
              team: {
                include: {
                  contingent: {
                    include: {
                      school: {
                        include: {
                          state: true
                        }
                      },
                      independent: {
                        include: {
                          state: true
                        }
                      },
                      higherInstitution: {
                        include: {
                          state: true
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
    },
  }));

  // Process each contest
  const contestStats: ContestStat[] = [];
  let totalTeams = 0;
  let totalContingents = 0;
  const uniqueContingents = new Set<number>();
  
  // Maps to group contests by school level
  const schoolLevelGroups = new Map<string, SchoolLevelGroup>();

  for (const contest of contests) {
    // Get the school level from target groups
    const schoolLevel = contest.targetgroup && contest.targetgroup.length > 0 
      ? contest.targetgroup[0].schoolLevel 
      : 'Uncategorized';
    const displayLevel = getDisplayNameForSchoolLevel(schoolLevel);

    // Initialize team counter per edu level
    const teamsByEduLevel: TeamsByEduLevel = {};
    
    // Set to track unique contingent IDs per contest
    const contestContingentIds = new Set<number>();
    let contestTeamCount = 0;

    // Process all event-contest teams
    for (const eventcontest of contest.eventcontests) {
      for (const ect of eventcontest.eventcontestteam) {
        // Check if this team belongs to a contingent in the specified state (if state filtering is applied)
        const team = ect.team;
        const contingent = team.contingent;
        
        // Get state and zone information from the team's contingent
        let contingentStateId;
        let stateZoneId;
          
        if (contingent.school) {
          contingentStateId = contingent.school.stateId;
          stateZoneId = contingent.school.state?.zoneId;
        } else if (contingent.independent) {
          contingentStateId = contingent.independent.stateId;
          stateZoneId = contingent.independent.state?.zoneId;
        } else if (contingent.higherInstitution) {
          contingentStateId = contingent.higherInstitution.stateId;
          stateZoneId = contingent.higherInstitution.state?.zoneId;
        }
        
        // Skip if state filter is active and this team's contingent is not from that state
        if (stateId !== undefined && contingentStateId !== stateId) {
          continue;
        }
        
        // Skip if zone filter is active and this team's contingent is not from that zone
        if (zoneId !== undefined && stateZoneId !== zoneId) {
          continue;
        }
        
        // Count team
        contestTeamCount++;
        totalTeams++;
        
        // Track contingent
        if (contingent?.id) {
          contestContingentIds.add(contingent.id);
          uniqueContingents.add(contingent.id);
        }
        
        // Determine edu level for this team
        let teamEduLevel = 'Other';
        if (contingent?.contingentType === 'SCHOOL' && contingent.school?.level) {
          teamEduLevel = contingent.school.level;
        }
        
        // Increment team count for this edu level
        teamsByEduLevel[teamEduLevel] = (teamsByEduLevel[teamEduLevel] || 0) + 1;
      }
    }

    // Add this contest to the results
    const contestStat = {
      contest: {
        id: contest.id,
        name: contest.name,
        code: contest.code,
        schoolLevel,
        displayLevel
      },
      contingentsCount: contestContingentIds.size,
      teamCount: contestTeamCount,
      teamsByEduLevel
    };
    
    contestStats.push(contestStat);
    
    // Add to school level group
    let group = schoolLevelGroups.get(schoolLevel);
    if (!group) {
      group = {
        schoolLevel,
        displayName: displayLevel,
        contests: []
      };
      schoolLevelGroups.set(schoolLevel, group);
    }
    
    group.contests.push(contestStat);
  }

  // Sort contests by name within each group
  schoolLevelGroups.forEach(group => {
    group.contests.sort((a, b) => a.contest.name.localeCompare(b.contest.name));
  });
  
  // Convert map to array and sort groups
  const groupedContests = Array.from(schoolLevelGroups.values());
  
  // Define the custom order for school levels
  const levelOrder: { [key: string]: number } = {
    'PRIMARY': 1,
    'SECONDARY': 2,
    'HIGHER EDUCATION': 3
  };
  
  // Sort groups by the defined order, with 'other' groups at the end
  groupedContests.sort((a, b) => {
    const orderA = levelOrder[a.schoolLevel.toUpperCase()] || 999;
    const orderB = levelOrder[b.schoolLevel.toUpperCase()] || 999;
    return orderA - orderB;
  });

  return {
    groupedContests,
    summary: {
      totalContests: contests.length,
      totalTeams,
      totalContingents: uniqueContingents.size
    },
    stateId,
    zoneId
  };
}
