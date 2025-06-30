import { prismaExecute } from "@/lib/prisma";

// Define types
export type ZoneData = {
  id: number;
  name: string;
};

export type StateData = {
  id: number;
  name: string;
};

export type StatsSummary = {
  schoolCount: number;
  teamCount: number;
  contestantCount: number;
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

// Function to get statistics for a specific state within a zone
export async function getStateStatistics(zoneId: number, stateId: number): Promise<StateStatsResult> {
  // Get zone and state info
  const zone = await prismaExecute<ZoneData | null>((prisma) => prisma.zone.findUnique({
    where: { id: zoneId },
    select: {
      id: true,
      name: true
    }
  }));
  
  const state = await prismaExecute<StateData | null>((prisma) => prisma.state.findUnique({
    where: { id: stateId },
    select: {
      id: true,
      name: true
    }
  }));
  
  if (!zone || !state) {
    return { 
      zone: null, 
      state: null, 
      groupedData: [],
      summary: { schoolCount: 0, teamCount: 0, contestantCount: 0 } 
    };
  }
  
  // Get contingents (both school and independent) in this state with their teams
  const contingents = await prismaExecute<ContingentData[]>((prisma) => prisma.contingent.findMany({
    where: {
      OR: [
        {
          // School contingents from this state
          school: { stateId },
        },
        {
          // Independent contingents from this state
          independent: { stateId },
        }
      ],
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
      school: {
        select: {
          name: true
        }
      }
    }
  }));
  
  // Get all contingent IDs
  const contingentIds = contingents.map(c => c.id);
  
  if (contingentIds.length === 0) {
    return { 
      zone, 
      state, 
      groupedData: [],
      summary: { schoolCount: 0, teamCount: 0, contestantCount: 0 } 
    };
  }
  
  // Get teams from these contingents with their event registrations and members
  const teams = await prismaExecute<TeamData[]>((prisma) => prisma.team.findMany({
    where: {
      contingentId: { in: contingentIds },
      eventcontestteam: {
        some: {}
      }
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
          eventcontestId: true,
          eventcontest: {
            select: {
              id: true,
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
  })) as TeamData[];

  // Process data to extract school level and contest information
  const schoolLevelGroups = new Map<string, SchoolLevelGroup>();

  // Process each team to collect school level, contest, and contingent data
  for (const team of teams) {
    for (const ect of team.eventcontestteam) {
      // Determine school level
      const contest = ect.eventcontest.contest;
      const contestTargetgroups = contest.targetgroup || [];
      const schoolLevel = contestTargetgroups.length > 0 ? contestTargetgroups[0].schoolLevel : 'Uncategorized';
      
      // Group by contest ID
      const contestId = contest.id;
      const contestName = contest.name;
      const contestCode = contest.code;
      
      // Find or create school level group
      let schoolLevelGroup = schoolLevelGroups.get(schoolLevel);
      if (!schoolLevelGroup) {
        schoolLevelGroup = {
          schoolLevel,
          contests: []
        };
        schoolLevelGroups.set(schoolLevel, schoolLevelGroup);
      }
      
      // Find or create contest group within school level group
      let contestGroup = schoolLevelGroup.contests.find(cg => cg.contestId === contestId);
      if (!contestGroup) {
        contestGroup = {
          contestId,
          contestName,
          contestCode,
          contingents: []
        };
        schoolLevelGroup.contests.push(contestGroup);
      }

      // Find contingent in this state
      const contingent = contingents.find(c => c.id === team.contingentId);
      if (!contingent) continue;
      
      let contingentEntry = contestGroup.contingents.find(c => c.id === contingent.id);
      if (!contingentEntry) {
        // Determine display name based on contingent type
        let displayName = contingent.name;
        if (contingent.contingentType === "SCHOOL" && contingent.school) {
          displayName = contingent.school.name;
        }

        contingentEntry = {
          id: contingent.id,
          displayName,
          contingentType: contingent.contingentType,
          teamsCount: 0,
          contestantsCount: 0
        };
        contestGroup.contingents.push(contingentEntry);
      }

      // Update team and contestant counts
      contingentEntry.teamsCount += 1;
      contingentEntry.contestantsCount += team.members.length;
    }
  }

  // Convert to array and sort
  const groupedData = Array.from(schoolLevelGroups.values());
  
  // Sort school level groups (Primary first, then Secondary, then Higher Education)
  const schoolLevelOrder: Record<string, number> = {
    'Primary': 1,
    'Secondary': 2,
    'Higher Education': 3
  };
  groupedData.sort((a: SchoolLevelGroup, b: SchoolLevelGroup) => {
    const orderA = schoolLevelOrder[a.schoolLevel] || 999;
    const orderB = schoolLevelOrder[b.schoolLevel] || 999;
    return orderA - orderB;
  });
  
  // Sort contests by name within each school level group
  for (const schoolLevelGroup of groupedData) {
    schoolLevelGroup.contests.sort((a: ContestGroup, b: ContestGroup) => a.contestName.localeCompare(b.contestName));
    
    // Sort contingents by name within each contest group
    for (const contestGroup of schoolLevelGroup.contests) {
      contestGroup.contingents.sort((a: ProcessedContingent, b: ProcessedContingent) => {
        return a.displayName.localeCompare(b.displayName);
      });
    }
  }

  // Calculate summary data
  const uniqueContingentIds = new Set<number>();
  const uniqueSchoolContingentIds = new Set<number>();
  let totalTeams = 0;
  let totalContestants = 0;

  for (const schoolLevelGroup of groupedData) {
    for (const contestGroup of schoolLevelGroup.contests) {
      for (const contingent of contestGroup.contingents) {
        uniqueContingentIds.add(contingent.id);
        if (contingent.contingentType === 'SCHOOL') {
          uniqueSchoolContingentIds.add(contingent.id);
        }
        totalTeams += contingent.teamsCount;
        totalContestants += contingent.contestantsCount;
      }
    }
  }
  
  const summary = {
    schoolCount: uniqueSchoolContingentIds.size,
    teamCount: totalTeams,
    contestantCount: totalContestants
  };

  return {
    zone,
    state,
    groupedData,
    summary
  };
}
