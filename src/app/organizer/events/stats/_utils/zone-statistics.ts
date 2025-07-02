import { prismaExecute } from "@/lib/prisma";

// Define the shapes of objects returned by Prisma
export type ZoneData = {
  id: number;
  name: string;
};

export type StatsSummary = {
  schoolCount: number;
  teamCount: number;
  contestantCount: number;
};

export type ZoneStatsResult = {
  zone: ZoneData | null;
  groupedData: SchoolLevelGroup[];
  summary: StatsSummary;
  contingentSummary: StateContingentSummary[];
};

type SchoolData = {
  id: number;
  name: string;
  stateId: number;
};

type IndependentData = {
  id: number;
  name: string;
  stateId: number;
};

type StateData = {
  id: number;
  name: string;
};

// Union type to handle different contingent structures from Prisma queries
type ContingentData = {
  id: number;
  name: string;
  contingentType: string; // Using string instead of enum to accommodate Prisma's return type
  independentId?: number | null;
  schoolId?: number | null;
  school?: {
    id: number;
    name: string;
    stateId?: number;
  } | null;
  independent?: {
    id: number;
    name: string;
    stateId: number;
  } | null;
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

export type ProcessedContingent = {
  id: number;
  displayName: string;
  contingentType: string;
  teamsCount: number;
  contestantsCount: number;
};

export type StateGroup = {
  stateId: number;
  stateName: string;
  contingents: ProcessedContingent[];
};

export type SchoolLevelGroup = {
  schoolLevel: string;
  contests: ContestGroup[];
};

export type ContestGroup = {
  contestId: number;
  contestName: string;
  contestCode: string;
  stateGroups: StateGroup[];
};

export type ContingentSummaryItem = {
  id: number;
  displayName: string;
  contingentType: string;
  totalTeams: number;
  totalContestants: number;
};

export type StateContingentSummary = {
  stateId: number;
  stateName: string;
  contingents: ContingentSummaryItem[];
};

// Create summary data grouped by state and contingent
function createStateSummary(groupedData: SchoolLevelGroup[]): StateContingentSummary[] {
  const stateMap = new Map<number, { 
    stateId: number; 
    stateName: string; 
    contingentSummaries: Map<number, ContingentSummaryItem>;
  }>();
  
  // Process all data to extract contingent summaries by state
  for (const schoolLevelGroup of groupedData) {
    for (const contestGroup of schoolLevelGroup.contests) {
      for (const stateGroup of contestGroup.stateGroups) {
        // Get or create state entry
        let stateSummary = stateMap.get(stateGroup.stateId);
        if (!stateSummary) {
          stateSummary = {
            stateId: stateGroup.stateId,
            stateName: stateGroup.stateName,
            contingentSummaries: new Map()
          };
          stateMap.set(stateGroup.stateId, stateSummary);
        }
        
        // Add contingent data
        for (const contingent of stateGroup.contingents) {
          let contingentSummary = stateSummary.contingentSummaries.get(contingent.id);
          if (!contingentSummary) {
            contingentSummary = {
              id: contingent.id,
              displayName: contingent.displayName,
              contingentType: contingent.contingentType,
              totalTeams: 0,
              totalContestants: 0
            };
            stateSummary.contingentSummaries.set(contingent.id, contingentSummary);
          }
          
          // Add teams and contestants
          contingentSummary.totalTeams += contingent.teamsCount;
          contingentSummary.totalContestants += contingent.contestantsCount;
        }
      }
    }
  }
  
  // Convert to array and sort states
  const stateSummaries: StateContingentSummary[] = [];
  
  // Convert maps to arrays and sort
  for (const [_, stateSummary] of stateMap.entries()) {
    const contingents = Array.from(stateSummary.contingentSummaries.values());
    contingents.sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    stateSummaries.push({
      stateId: stateSummary.stateId,
      stateName: stateSummary.stateName,
      contingents: contingents
    });
  }
  
  // Sort states by name
  stateSummaries.sort((a, b) => a.stateName.localeCompare(b.stateName));
  
  return stateSummaries;
}

export async function getZoneStatistics(zoneId: number): Promise<ZoneStatsResult> {
  // First, get the zone to ensure it exists
  const zone = await prismaExecute<ZoneData | null>((prisma) => prisma.zone.findUnique({
    where: {
      id: zoneId
    },
    select: {
      id: true,
      name: true
    }
  }));
  
  if (!zone) {
    return { zone: null, groupedData: [], summary: { schoolCount: 0, teamCount: 0, contestantCount: 0 }, contingentSummary: [] };
  }
  
  // Get all states in this zone
  const states = await prismaExecute<StateData[]>((prisma) => prisma.state.findMany({
    where: { zoneId },
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  }));

  // Create a map of state IDs to state names for quick lookup
  const stateNameMap = new Map<number, string>();
  states.forEach(state => {
    stateNameMap.set(state.id, state.name.replace('WILAYAH PERSEKUTUAN', 'WP'));
  });
  
  // Get school contingents with their school, state, and teams
  const schoolContingents = await prismaExecute<ContingentData[]>((prisma) => prisma.contingent.findMany({
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
          stateId: true
        }
      }
    }
  }));
  
  // Get independent contingents with their independent entity, state, and teams
  const independentContingents = await prismaExecute<ContingentData[]>((prisma) => prisma.contingent.findMany({
    where: {
      contingentType: "INDEPENDENT",
      independent: {
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
      independentId: true,
      independent: {
        select: {
          id: true,
          name: true,
          stateId: true
        }
      }
    }
  }));
  
  // Get all contingent IDs
  const contingentIds = [
    ...schoolContingents.map(c => c.id),
    ...independentContingents.map(c => c.id)
  ];
  
  if (contingentIds.length === 0) {
    return { zone, groupedData: [], summary: { schoolCount: 0, teamCount: 0, contestantCount: 0 }, contingentSummary: [] };
  }

  // Create a state ID map for independent contingents without additional queries
  const independentStateMap = new Map<number, number>();
  for (const contingent of independentContingents) {
    if (contingent.independent && contingent.independent.stateId) {
      independentStateMap.set(contingent.id, contingent.independent.stateId);
    }
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
          stateGroups: []
        };
        schoolLevelGroup.contests.push(contestGroup);
      }

      // Get state ID for this contingent
      let stateId: number | undefined;
      
      // Check if this is a school contingent
      const schoolContingent = schoolContingents.find(c => c.id === team.contingentId);
      if (schoolContingent && schoolContingent.school && schoolContingent.school.stateId) {
        stateId = schoolContingent.school.stateId;
      } else {
        // Assume this is an independent contingent
        stateId = independentStateMap.get(team.contingentId);
      }

      // Skip if we couldn't determine the state
      if (!stateId) continue;

      // Get state name for this state ID
      const stateName = stateNameMap.get(stateId) || `State ID: ${stateId}`;

      // Find or create state group in this contest
      let stateGroup = contestGroup.stateGroups.find(sg => sg.stateId === stateId);
      if (!stateGroup) {
        stateGroup = {
          stateId,
          stateName,
          contingents: []
        };
        contestGroup.stateGroups.push(stateGroup);
      }

      // Find contingent in this state group
      const contingent = schoolContingent || independentContingents.find(c => c.id === team.contingentId);
      if (!contingent) continue;
      
      let contingentEntry = stateGroup.contingents.find(c => c.id === contingent.id);
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
        stateGroup.contingents.push(contingentEntry);
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
  }

    // Sort state groups by name within each contest
  for (const schoolLevelGroup of groupedData) {
    for (const contestGroup of schoolLevelGroup.contests) {
      contestGroup.stateGroups.sort((a: StateGroup, b: StateGroup) => a.stateName.localeCompare(b.stateName));
      
      // Sort contingents by name within each state group
      for (const stateGroup of contestGroup.stateGroups) {
        stateGroup.contingents.sort((a: ProcessedContingent, b: ProcessedContingent) => {
          return a.displayName.localeCompare(b.displayName);
        });
      }
    }
  }

  // Calculate summary data
  const uniqueContingentIds = new Set<number>();
  const uniqueSchoolContingentIds = new Set<number>();
  let totalTeams = 0;
  let totalContestants = 0;

  for (const schoolLevelGroup of groupedData) {
    for (const contestGroup of schoolLevelGroup.contests) {
      for (const stateGroup of contestGroup.stateGroups) {
        for (const contingent of stateGroup.contingents) {
          uniqueContingentIds.add(contingent.id);
          if (contingent.contingentType === 'SCHOOL') {
            uniqueSchoolContingentIds.add(contingent.id);
          }
          totalTeams += contingent.teamsCount;
          totalContestants += contingent.contestantsCount;
        }
      }
    }
  }
  
  const summary = {
    schoolCount: uniqueSchoolContingentIds.size,
    teamCount: totalTeams,
    contestantCount: totalContestants
  };

  // Create state-contingent summary
  const contingentSummary = createStateSummary(groupedData);

  return {
    zone,
    groupedData,
    summary,
    contingentSummary
  };
}
