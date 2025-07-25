import { prismaExecute } from "@/lib/prisma";
import { cookies } from "next/headers";

interface TeamsRawDataApiResponse {
  teams: TeamRawDataItem[];
  totalCount: number;
}

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
  // Added fields from API
  schoolLevel?: string | null;
  independentType?: string | null;
  contestLevel?: string | null;
};

// Define the shapes of objects returned by Prisma
export type ZoneData = {
  id: number;
  name: string;
};

export type StatsSummary = {
  schoolCount: number;
  teamCount: number;
  contestantCount: number;
  contingentCount: number; // Total contingents
  independentCount: number; // Independent contingents
};

export interface ZoneStatsResult {
  zone: ZoneData | null;
  groupedData: SchoolLevelGroup[];
  summary: StatsSummary;
  contingentSummary: StateContingentSummary[];
  rawTeamData?: TeamRawDataItem[];
  error?: string; // Optional error message when data loading fails
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

export type ContingentSummary = {
  contingentId: number;
  contingentName: string;
  contingentType: string;
  teamsCount: number;
  contestantsCount: number;
  stateId: number;
  stateName: string;
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

/**
 * Generate contingent summaries from raw team data
 * This uses the contingentTeams and contingentMembers data prepared in processTeamRawData
 */
function generateContingentSummaries(
  groupedData: SchoolLevelGroup[], 
  contingentTeams: Map<number, Set<number>>,
  contingentMembers: Map<number, Set<string>>
): StateContingentSummary[] {
  // Group contingents by state
  const stateContingentMap = new Map<number, StateContingentSummary>();
  
  // Track contingent data for state grouping
  const contingentStateMap = new Map<number, {
    stateId: number;
    stateName: string;
    displayName: string;
    contingentType: string;
  }>();
  
  // First collect all contingents to get state data
  for (const schoolGroup of groupedData) {
    for (const contest of schoolGroup.contests) {
      for (const state of contest.stateGroups) {
        for (const contingent of state.contingents) {
          // Store contingent state information
          contingentStateMap.set(contingent.id, {
            stateId: state.stateId,
            stateName: state.stateName,
            displayName: contingent.displayName,
            contingentType: contingent.contingentType,
          });
        }
      }
    }
  }
  
  // Process all contingents from the raw data tracking maps
  for (const [contingentId, teamIds] of contingentTeams.entries()) {
    const contingentInfo = contingentStateMap.get(contingentId);
    if (!contingentInfo) continue; // Skip if no state info
    
    // Ensure state entry exists
    if (!stateContingentMap.has(contingentInfo.stateId)) {
      stateContingentMap.set(contingentInfo.stateId, {
        stateId: contingentInfo.stateId,
        stateName: contingentInfo.stateName,
        contingents: []
      });
    }
    
    // Add contingent to state with actual counts from raw data
    stateContingentMap.get(contingentInfo.stateId)!.contingents.push({
      id: contingentId,
      displayName: contingentInfo.displayName,
      contingentType: contingentInfo.contingentType,
      totalTeams: teamIds.size, // Actual count of unique teams in this contingent
      totalContestants: contingentMembers.get(contingentId)?.size || 0 // Actual count of unique members
    });
  }
  
  // Convert to array and sort
  const result = Array.from(stateContingentMap.values());
  
  // Sort states alphabetically
  result.sort((a, b) => a.stateName.localeCompare(b.stateName));
  
  // Sort contingents within each state
  for (const state of result) {
    state.contingents.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
  
  return result;
}

/**
 * Process team raw data from API to generate zone statistics
 */
function processTeamRawData(teamItems: TeamRawDataItem[]): {
  groupedData: SchoolLevelGroup[];
  uniqueTeamIds: Set<number>;
  uniqueContestantIds: Set<string>;
  uniqueSchoolIds: Set<number>;
  uniqueContingentIds: Set<number>; // Track ALL contingent types
  independentContingentIds: Set<number>; // Track INDEPENDENT contingents
  contingentTeams: Map<number, Set<number>>; // Teams per contingent
  contingentMembers: Map<number, Set<string>>; // Members per contingent
  contestContingentTeamsMap: Map<string, Set<number>>; // Teams per contest+contingent
  contestContingentMembersMap: Map<string, Set<string>>; // Members per contest+contingent
} {
  // Filter out teams with no members first
  const validTeams = teamItems.filter(team => team.numberOfMembers > 0);
  console.log(`[processTeamRawData] Filtered ${teamItems.length - validTeams.length} teams with no members out of ${teamItems.length} total teams`);
  
  // Data structures to track unique entities and organize results
  const schoolLevelGroups = new Map<string, SchoolLevelGroup>();
  const uniqueTeamIds = new Set<number>();
  const uniqueContestantIds = new Set<string>(); 
  const uniqueSchoolIds = new Set<number>();
  const uniqueContingentIds = new Set<number>();
  const independentContingentIds = new Set<number>();
  
  // Initialize tracking maps for processing
  const contingentTeams = new Map<number, Set<number>>();
  const contingentMembers = new Map<number, Set<string>>();
  const contestContingentTeamsMap = new Map<string, Set<number>>();
  const contestContingentMembersMap = new Map<string, Set<string>>();
  
  // Process only valid teams (with members)
  for (const item of validTeams) {
    // Add to tracking sets
    uniqueTeamIds.add(item.teamId);
    uniqueContingentIds.add(item.contingentId);
    
    // Track contingent types
    if (item.contingentType === 'SCHOOL') {
      uniqueSchoolIds.add(item.contingentId);
    } else if (item.contingentType === 'INDEPENDENT') {
      independentContingentIds.add(item.contingentId);
    }
    
    // Track teams and members by contingent
    if (!contingentTeams.has(item.contingentId)) {
      contingentTeams.set(item.contingentId, new Set<number>());
    }
    contingentTeams.get(item.contingentId)!.add(item.teamId);
    
    // Track teams by contest+contingent to avoid double-counting in contest views
    let contestContingentKey = `${item.contestId}_${item.contingentId}`;
    if (!contestContingentTeamsMap.has(contestContingentKey)) {
      contestContingentTeamsMap.set(contestContingentKey, new Set<number>());
    }
    contestContingentTeamsMap.get(contestContingentKey)!.add(item.teamId);
    
    // Also track members by contest+contingent
    if (!contestContingentMembersMap.has(contestContingentKey)) {
      contestContingentMembersMap.set(contestContingentKey, new Set<string>());
    }
    
    if (!contingentMembers.has(item.contingentId)) {
      contingentMembers.set(item.contingentId, new Set<string>());
    }
    
    // Create synthetic contestant IDs for tracking
    for (let i = 0; i < item.numberOfMembers; i++) {
      const syntheticId = `team_${item.teamId}_member_${i}`;
      contingentMembers.get(item.contingentId)!.add(syntheticId);
      uniqueContestantIds.add(syntheticId);
      
      // Also add to contest+contingent members map to avoid double counting in contest views
      contestContingentMembersMap.get(contestContingentKey)!.add(syntheticId);
    }
    
    // Use contestLevel from API, but transform it to match our expected values
    // We know all entries should be "Kids" in this case
    let schoolLevel = 'Kids'; // Default to Kids
    
    if (item.contestLevel) {
      // If API provides contestLevel, use it directly
      schoolLevel = item.contestLevel;
      console.log(`[processTeamRawData] Using API-provided contestLevel: ${schoolLevel} for team ${item.teamId}, contest ${item.contestId}`);
    } else {
      console.log(`[processTeamRawData] WARNING: Missing contestLevel for team ${item.teamId}, using default: ${schoolLevel}`);
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
        stateGroups: []
      };
      schoolLevelGroup.contests.push(contestGroup);
    }
    
    // Create or get state group
    let stateGroup = contestGroup.stateGroups.find(sg => sg.stateId === item.stateId);
    if (!stateGroup) {
      stateGroup = {
        stateId: item.stateId,
        stateName: item.stateName.replace('WILAYAH PERSEKUTUAN', 'WP'),
        contingents: []
      };
      contestGroup.stateGroups.push(stateGroup);
    }
    
    // Create or get contingent
    let contingent = stateGroup.contingents.find(c => c.id === item.contingentId);
    if (!contingent) {
      contingent = {
        id: item.contingentId,
        displayName: item.contingentName,
        contingentType: item.contingentType,
        teamsCount: 0,
        contestantsCount: 0
      };
      stateGroup.contingents.push(contingent);
    }
    
    // Use the contestContingentTeamsMap to calculate team counts per contest+contingent
    // This prevents the same team from being counted in multiple contests
    // Reuse the same contestContingentKey from earlier
    
    // Update team and contestant counts using the contest-specific tracking maps
    contingent.teamsCount = contestContingentTeamsMap.get(contestContingentKey)?.size || 0;
    contingent.contestantsCount = contestContingentMembersMap.get(contestContingentKey)?.size || 0;
    
    // Log for debugging
    console.log(`[processTeamRawData] Contest ${item.contestName} (${item.contestId}), Contingent ${item.contingentName} (${item.contingentId}): ${contingent.teamsCount} teams`);
  }
  
  // Convert to array and apply sorting
  const groupedData = Array.from(schoolLevelGroups.values());
  
  // Sort school levels
  const schoolLevelOrder: Record<string, number> = {
    'Primary': 1,
    'Secondary': 2,
    'Higher Education': 3
  };
  
  groupedData.sort((a, b) => {
    const orderA = schoolLevelOrder[a.schoolLevel] || 999;
    const orderB = schoolLevelOrder[b.schoolLevel] || 999;
    return orderA - orderB;
  });
  
  // Sort contests, states and contingents
  for (const schoolLevelGroup of groupedData) {
    schoolLevelGroup.contests.sort((a, b) => a.contestName.localeCompare(b.contestName));
    
    for (const contestGroup of schoolLevelGroup.contests) {
      contestGroup.stateGroups.sort((a, b) => a.stateName.localeCompare(b.stateName));
      
      for (const stateGroup of contestGroup.stateGroups) {
        stateGroup.contingents.sort((a, b) => a.displayName.localeCompare(b.displayName));
      }
    }
  }
  
  // Convert our data structures to the expected format and return
  return {
    groupedData, // Use the already formatted groupedData
    uniqueTeamIds,
    uniqueContestantIds,
    uniqueSchoolIds,
    uniqueContingentIds,
    independentContingentIds,
    contingentTeams,           // Include the contingent teams map
    contingentMembers,         // Include the contingent members map
    contestContingentTeamsMap,  // Include the contest+contingent teams map
    contestContingentMembersMap // Include the contest+contingent members map
  };
}

export async function getZoneStatistics(zoneId: number | string): Promise<ZoneStatsResult> {
  // Ensure zoneId is a number
  const zoneIdNumber = typeof zoneId === 'string' ? parseInt(zoneId, 10) : zoneId;
  if (isNaN(zoneIdNumber)) {
    throw new Error(`Invalid zoneId: ${zoneId}`);
  }
  // Use zoneIdNumber for all database queries
  try {
    // First, get the zone to ensure it exists
    const zone = await prismaExecute<ZoneData | null>((prisma) => prisma.zone.findUnique({
      where: { id: zoneIdNumber },
    }));
    if (!zone) {
      throw new Error(`Zone ${zoneIdNumber} not found.`);
    }
    
    // Get all events with scopeArea = ZONE (not just the active event)
    const zoneEvents = await prismaExecute<{ id: number }[]>((prisma) =>
      prisma.event.findMany({
        where: { 
          scopeArea: 'ZONE',
          isActive: true  // Still only include active events
        },
        select: { id: true },
      })
    );

    if (zoneEvents.length === 0) {
      throw new Error("No events with scopeArea = ZONE found.");
    }
    
    // Get all event IDs
    const eventIds = zoneEvents.map(e => e.id);
    console.log(`[getZoneStatistics] Found ${eventIds.length} ZONE events: ${eventIds.join(', ')}`);
    
    // Use the first event ID for backward compatibility with the rest of the code
    const eventId = eventIds[0];
    
    
    console.log(`[getZoneStatistics] Fetching data for zone ${zoneIdNumber} and event ${eventId}`);

    // Instead of making an API call, fetch team data directly from the database
    // This follows the same query structure as the API endpoint but with direct DB access
    console.log(`[getZoneStatistics] DEBUG - Query parameters: zoneId=${zoneIdNumber}, eventId=${eventId}`);
    
    // First check if there are any teams in this zone to confirm our data model is correct
    const zoneTeamCount = await prismaExecute<number>(async (prisma) => {
      return prisma.team.count({
        where: {
          contingent: {
            OR: [
              { school: { state: { zoneId: zoneIdNumber } } },
              { independent: { state: { zoneId: zoneIdNumber } } }
            ]
          }
        }
      });
    });
    
    console.log(`[getZoneStatistics] DEBUG - Found ${zoneTeamCount} teams in zone ${zoneIdNumber} before applying event filter`);
    
    // Check if there are any eventcontestteams for this event
    const eventTeamCount = await prismaExecute<number>(async (prisma) => {
      return prisma.eventcontestteam.count({
        where: {
          eventcontest: {
            eventId: eventId,
          },
        }
      });
    });
    
    console.log(`[getZoneStatistics] DEBUG - Found ${eventTeamCount} event contest teams for event ${eventId} before applying zone filter`);
    
    // Try a broader query first with less filtering to see what data exists
    // Let's go back to basics with a simpler approach - first get all teams in the zone
    const statesInZone = await prismaExecute<{id: number, name: string}[]>(async (prisma) => {
      return prisma.state.findMany({
        where: { zoneId: zoneIdNumber },
        select: { id: true, name: true },
      });
    });
    
    console.log(`[getZoneStatistics] DEBUG - Found ${statesInZone.length} states in zone ${zoneIdNumber}:`,  
      statesInZone.map(s => `${s.name} (${s.id})`).join(', '));
    
    if (statesInZone.length === 0) {
      console.error(`[getZoneStatistics] ERROR - No states found in zone ${zoneIdNumber}`);
      throw new Error(`No states found in zone ${zoneIdNumber}`);
    }
    
    // Get all state IDs in this zone
    const stateIds = statesInZone.map(s => s.id);
    
    // Instead of complex joins, use a direct raw SQL query to ensure data consistency
    // This will query the primary tables directly
    const rawTeamData: TeamRawDataItem[] = [];
    
    // Implement a fallback mechanism - if we can't get teams through regular prisma query,
    // use a simpler approach to at least get something to display
    try {
      // Get all teams in the active event for this zone via simpler query
      // Specify Prisma.Prisma.$QueryRawArgs<any> for raw SQL query result
      // This tells TypeScript that the result will be an array
      const teamDataFromEvent = await prismaExecute<any[]>(async (prisma) => {
        // First get teams for this event in these states
        // Use simpler join approach to ensure we get results
        // Use Prisma.sql to ensure type safety with the raw query
        const results = await prisma.$queryRaw<any[]>`
          -- Raw SQL query to get zone statistics directly
          SELECT 
            e.id as eventId, e.name as eventName,
            z.id as zoneId, z.name as zoneName,
            s.id as stateId, s.name as stateName, 
            c.id as contestId, c.name as contestName, c.code as contestCode,
            cont.id as contingentId, cont.name as contingentName, cont.contingentType,
            t.id as teamId, t.name as teamName,
            (SELECT COUNT(*) FROM teammember WHERE teammember.teamId = t.id) as numberOfMembers,
            'Kids' as schoolLevel -- Default value since contesttargetgroup table doesn't exist
          FROM team t
          JOIN contingent cont ON t.contingentId = cont.id
          LEFT JOIN school sch ON cont.schoolId = sch.id
          LEFT JOIN independent ind ON cont.independentId = ind.id
          JOIN state s ON (sch.stateId = s.id OR ind.stateId = s.id)
          JOIN zone z ON s.zoneId = z.id
          JOIN eventcontestteam ect ON ect.teamId = t.id
          JOIN eventcontest ec ON ect.eventcontestId = ec.id
          JOIN contest c ON ec.contestId = c.id
          JOIN event e ON ec.eventId = e.id
          -- Removed reference to non-existent contesttargetgroup table
          WHERE z.id = ${zoneId}
          AND e.scopeArea = 'ZONE'
          AND e.isActive = true
        `;
        
        return results;
      });
      
      console.log(`[getZoneStatistics] DEBUG - Found ${teamDataFromEvent.length} teams using raw SQL query`);
      
      // Transform raw data to expected format
      if (Array.isArray(teamDataFromEvent) && teamDataFromEvent.length > 0) {
        for (const row of teamDataFromEvent) {
          const r = row as any;
          // Get contest level from school level
          let contestLevel = null;
          if (r.schoolLevel === 'Primary') contestLevel = 'Kids';
          else if (r.schoolLevel === 'Secondary') contestLevel = 'Teens';
          else if (r.schoolLevel === 'Higher Education') contestLevel = 'Youth';
          
          rawTeamData.push({
            eventId: Number(r.eventId),
            eventName: r.eventName,
            zoneId: Number(r.zoneId),
            zoneName: r.zoneName,
            stateId: Number(r.stateId),
            stateName: r.stateName,
            contestId: Number(r.contestId),
            contestName: r.contestName,
            contestCode: r.contestCode,
            contingentId: Number(r.contingentId),
            contingentName: r.contingentName,
            contingentType: r.contingentType,
            teamId: Number(r.teamId),
            teamName: r.teamName || `Team ${r.teamId}`,
            numberOfMembers: Number(r.numberOfMembers),
            schoolLevel: r.schoolLevel,
            contestLevel: contestLevel,
            independentType: r.contingentType === 'INDEPENDENT' ? 'independent' : null
          });
        }
      }
    } catch (error) {
      console.error(`[getZoneStatistics] Error in raw SQL query:`, error);
      // Continue execution - we'll try standard query as fallback
    }
    
    // If we got data from raw SQL, skip the complex query
    if (rawTeamData.length > 0) {
      console.log(`[getZoneStatistics] Using ${rawTeamData.length} teams from raw SQL query instead of complex query`);
      // Process data directly
      const teamData = rawTeamData.filter(team => team.numberOfMembers > 0);
      
      console.log(`[getZoneStatistics] After filtering empty teams: ${teamData.length} teams remain from raw SQL`);
      
      // Log the team data for debugging
      logTeamData(teamData);

      // Process the team data 
      const { 
        groupedData, 
        uniqueTeamIds, 
        uniqueContestantIds, 
        uniqueSchoolIds, 
        uniqueContingentIds, 
        independentContingentIds, 
        contingentTeams,
        contingentMembers
      } = processTeamRawData(teamData);

      // Generate contingent summaries
      const stateContingentSummaries = generateContingentSummaries(groupedData, contingentTeams, contingentMembers);
      
      // Create a summary
      let totalTeams = 0;
      let totalContestants = 0;
      
      stateContingentSummaries.forEach(state => {
        state.contingents.forEach(contingent => {
          totalTeams += contingent.totalTeams;
          totalContestants += contingent.totalContestants;
        });
      });
      
      const summary = {
        schoolCount: uniqueSchoolIds.size,
        teamCount: totalTeams,
        contestantCount: totalContestants,
        contingentCount: uniqueContingentIds.size,
        independentCount: independentContingentIds.size
      };
      
      return {
        zone,
        groupedData,
        summary,
        contingentSummary: stateContingentSummaries,
        rawTeamData: teamData
      };
    }
    
    // If raw SQL didn't work, try with standard Prisma query as fallback
    console.log(`[getZoneStatistics] Falling back to standard Prisma query`);
    const eventcontestteams = await prismaExecute(async (prisma) => {
      return prisma.eventcontestteam.findMany({
        where: {
          team: {
            contingent: {
              OR: [
                { school: { state: { zoneId: zoneIdNumber } } },
                { independent: { state: { zoneId: zoneIdNumber } } }
              ]
            }
          },
          eventcontest: {
            event: {
              scopeArea: 'ZONE',
              isActive: true
            }
          }
        },
        include: {
          team: {
            include: {
              members: {
                select: {
                  contestantId: true
                }
              },
              contingent: {
                include: {
                  independent: {
                    include: {
                      state: true
                    }
                  },
                  school: {
                    include: {
                      state: true
                    }
                  },
                }
              }
            }
          },
          eventcontest: {
            include: {
              contest: {
                include: {
                  targetgroup: true
                }
              },
              event: true
            }
          }
        }
      });
    });

    console.log(`[getZoneStatistics] Found ${eventcontestteams.length} event contest teams`);

    console.log(`[getZoneStatistics] DEBUG - Found ${eventcontestteams.length} event contest teams with our query`);
    
    // Check if we actually have data in the result
    if (eventcontestteams.length === 0) {
      console.log(`[getZoneStatistics] WARNING - No event contest teams found for zone ${zoneIdNumber} and event ${eventId}`);
      console.log(`[getZoneStatistics] Attempting to check if we have teams per state directly...`);
      
      // Check each state individually
      for (const state of statesInZone) {
        const teamsInState = await prismaExecute<number>(async (prisma) => {
          return prisma.team.count({
            where: {
              contingent: {
                OR: [
                  { schoolId: { not: null }, school: { stateId: state.id } },
                  { independentId: { not: null }, independent: { stateId: state.id } }
                ]
              }
            }
          });
        });
        
        console.log(`[getZoneStatistics] DEBUG - State ${state.name} (${state.id}) has ${teamsInState} teams`);
        
        // Also check eventcontest for this event
        const eventContests = await prismaExecute<{id: number}[]>(async (prisma) => {
          return prisma.eventcontest.findMany({
            where: { eventId },
            select: { id: true },
          });
        });
        
        if (eventContests.length > 0) {
          // Also check events for this state
          const eventteamsInState = await prismaExecute<number>(async (prisma) => {
            return prisma.eventcontestteam.count({
              where: {
                eventcontestId: { in: eventContests.map((ec: {id: number}) => ec.id) },
                team: {
                  contingent: {
                    OR: [
                      { schoolId: { not: null }, school: { stateId: state.id } },
                      { independentId: { not: null }, independent: { stateId: state.id } }
                    ]
                  }
                }
              }
            });
          });
          
          console.log(`[getZoneStatistics] DEBUG - State ${state.name} (${state.id}) has ${eventteamsInState} event contest teams`);
        } else {
          console.log(`[getZoneStatistics] DEBUG - No eventcontests found for event ${eventId}`);
        }
      }
    }
    
    // Transform the prisma data to match the expected API response format
    const transformedTeamItems: TeamRawDataItem[] = eventcontestteams.map(ect => {
      // Need to use type assertion since Prisma's type doesn't match our expected structure
      // due to complex include patterns
      const ectAny = ect as any;
      // Extract needed data from the complex nested structure
      const team = ectAny.team;
      const contingent = team.contingent;
      const eventcontest = ectAny.eventcontest;
      const contest = eventcontest.contest;
      const event = eventcontest.event;
      
      // Log all included data to help debug
      console.log(`[getZoneStatistics] DEBUG - Processing team ID ${team.id} in contingent ${contingent.name} (${contingent.id})`);

      
      // Determine state information based on contingent type
      const stateInfo = contingent.school?.state || contingent.independent?.state;
      
      // Handle target group and school level
      const targetGroup = contest.targetgroup[0];
      const schoolLevel = targetGroup?.schoolLevel;
      
      // Get contest level from school level
      let contestLevel = null;
      if (schoolLevel === 'Primary') contestLevel = 'Kids';
      else if (schoolLevel === 'Secondary') contestLevel = 'Teens';
      else if (schoolLevel === 'Higher Education') contestLevel = 'Youth';
      
      // Create an object that matches the expected API response structure
      return {
        eventId: event.id,
        eventName: event.name,
        zoneId: zoneIdNumber,
        zoneName: zone.name,
        stateId: stateInfo?.id || 0,
        stateName: stateInfo?.name || 'Unknown',
        contestId: contest.id,
        contestName: contest.name,
        contestCode: contest.code,
        contingentId: contingent.id,
        contingentName: contingent.name,
        contingentType: contingent.contingentType,
        teamId: team.id,
        teamName: team.name || `Team ${team.id}`,
        numberOfMembers: team.members.length,
        schoolLevel: schoolLevel || null,
        contestLevel: contestLevel || schoolLevel || null,
        independentType: contingent.contingentType === 'INDEPENDENT' ? 'independent' : null,
      };
    });
    
    // Log transformed data for debugging
    console.log(`[getZoneStatistics] Transformed ${transformedTeamItems.length} teams`);

    // Filter out teams with no members
    const teamData = transformedTeamItems.filter(team => team.numberOfMembers > 0);
    console.log(`[getZoneStatistics] After filtering empty teams: ${teamData.length} teams remain`);

    // Log the team data statistics
    function logTeamData(data: TeamRawDataItem[]): void {
      console.log(`[getZoneStatistics] ===== COMPLETE RAW TEAM DATA FOR ZONE ${zoneIdNumber} =====`);
      
      // Count teams by various properties
      const teamsByContest: Record<string, number> = {};
      const teamsByContestLevel: Record<string, number> = {};
      const teamsByState: Record<string, number> = {};
      const teamsByContingent: Record<string, number> = {};
      const teamsByMemberCount: Record<string, number> = {};
      
      for (const team of data) {
        // By contest
        teamsByContest[team.contestName] = (teamsByContest[team.contestName] || 0) + 1;
        
        // By contest level
        teamsByContestLevel[team.contestLevel || 'Undefined'] = (teamsByContestLevel[team.contestLevel || 'Undefined'] || 0) + 1;
        
        // By state
        teamsByState[team.stateName] = (teamsByState[team.stateName] || 0) + 1;
        
        // By contingent type
        teamsByContingent[team.contingentType] = (teamsByContingent[team.contingentType] || 0) + 1;
        
        // By member count
        teamsByMemberCount[team.numberOfMembers] = (teamsByMemberCount[team.numberOfMembers] || 0) + 1;
      }
      
      console.log(`[getZoneStatistics] TOTAL TEAMS IN RAW DATA: ${data.length}`);
      console.log(`[getZoneStatistics] Teams by Contest:`, teamsByContest);
      console.log(`[getZoneStatistics] Teams by Contest Level:`, teamsByContestLevel);
      console.log(`[getZoneStatistics] Teams by State:`, teamsByState);
      console.log(`[getZoneStatistics] Teams by Contingent Type:`, teamsByContingent);
      console.log(`[getZoneStatistics] Teams by Member Count:`, teamsByMemberCount);
      
      // Count empty teams
      const emptyTeams = data.filter(t => t.numberOfMembers === 0);
      if (data.length > 0) {
        console.log(`[getZoneStatistics] Teams with no members: ${emptyTeams.length} (${((emptyTeams.length / data.length) * 100).toFixed(1)}%)`);
      }
      
      // Log first few empty teams for debugging
      if (emptyTeams.length > 0) {
        console.log(`[getZoneStatistics] Sample empty teams:`, emptyTeams.slice(0, 3));
      }
    }
    
      // Log the team data for debugging
    logTeamData(teamData);

    // Process the team data 
    const { 
      groupedData, 
      uniqueTeamIds, 
      uniqueContestantIds, 
      uniqueSchoolIds, 
      uniqueContingentIds, 
      independentContingentIds, 
      contingentTeams, // Get the contingent team map
      contingentMembers  // Get the contingent members map
    } = processTeamRawData(teamData);

    // Generate contingent summaries using our helper function with all required parameters
    const stateContingentSummaries = generateContingentSummaries(groupedData, contingentTeams, contingentMembers);

    // Get all states in this zone (still need this for reference)
    const states = await prismaExecute<StateData[]>((prisma) => prisma.state.findMany({
      where: { zoneId: zoneIdNumber },
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
    
    // Create the summary by aggregating counts from contingent summaries to ensure consistency
    // First aggregate the counts from the contingentSummary to ensure they match
    let totalTeams = 0;
    let totalContestants = 0;
    
    // Count across all contingent summaries to ensure numbers match
    stateContingentSummaries.forEach(state => {
      state.contingents.forEach(contingent => {
        totalTeams += contingent.totalTeams;
        totalContestants += contingent.totalContestants;
      });
    });
    
    // Now we can create a summary with consistent counts
    const summary = {
      schoolCount: uniqueSchoolIds.size,
      teamCount: totalTeams, // Use aggregated team count from contingent summary
      contestantCount: totalContestants, // Use aggregated contestant count from contingent summary
      contingentCount: uniqueContingentIds.size, // Total contingents
      independentCount: independentContingentIds.size // Independent contingents
    };
    
    // Log the counts for debugging
    console.log(`[getZoneStatistics] SUMMARY COUNTS:`, {
      schoolCount: summary.schoolCount,
      teamCount: summary.teamCount, 
      contestantCount: summary.contestantCount,
      contingentCount: summary.contingentCount,
      independentCount: summary.independentCount,
      rawUniqueTeamCount: uniqueTeamIds.size,
      rawUniqueContestantCount: uniqueContestantIds.size
    });

    return {
      zone,
      groupedData,
      summary,
      contingentSummary: stateContingentSummaries,
      rawTeamData: teamData
    };
  } catch (error) {
    console.error(`[getZoneStatistics] Error processing zone statistics for zone ${zoneIdNumber}:`, error);
    
    // Variables defined in try block won't be accessible here, so we need to handle them carefully
    let zoneData: ZoneData | null = null;
    
    // Try to fetch basic zone info again for debugging purposes
    try {
      // First attempt to get the zone again
      zoneData = await prismaExecute<ZoneData | null>((prisma) => prisma.zone.findUnique({
        where: { id: zoneIdNumber },
      }));
      
      // Display more detailed debugging information
      console.error(`[getZoneStatistics] DEBUG - Error stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
      console.error(`[getZoneStatistics] DEBUG - Zone ID:`, zoneIdNumber);
      
      // Try to get event ID
      const eventData = await prismaExecute<{ id: number } | null>((prisma) =>
        prisma.event.findFirst({
          where: { isActive: true },
          select: { id: true },
        })
      );
      console.error(`[getZoneStatistics] DEBUG - Active event ID:`, eventData ? eventData.id : 'unknown');
      
      // Check for states in zone
      const statesInZoneCheck = await prismaExecute<{id: number, name: string}[]>(async (prisma) => {
        return prisma.state.findMany({
          where: { zoneId: Number(zoneIdNumber) },
          select: { id: true, name: true },
        });
      });
      
      // Log whether zone exists and states in zone
      console.error(`[getZoneStatistics] DEBUG - Zone exists:`, !!zoneData);
      console.error(`[getZoneStatistics] DEBUG - States in zone:`, statesInZoneCheck?.length || 'unknown');
      
      // Check if this zone has any valid data at all
      const basicCheck = await prismaExecute<{count: number}[]>(async (prisma) => {
        return prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM zone z
          JOIN state s ON s.zoneId = z.id
          JOIN contingent c ON (c.schoolId IN (SELECT id FROM school WHERE stateId = s.id) OR c.independentId IN (SELECT id FROM independent WHERE stateId = s.id))
          WHERE z.id = ${zoneId}
        `;
      });
      
      console.error(`[getZoneStatistics] DEBUG - Basic contingent check:`, basicCheck);
      
      // Check if there are any teams at all for this zone
      const teamCheck = await prismaExecute<{count: number}[]>(async (prisma) => {
        return prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM team t
          JOIN contingent c ON t.contingentId = c.id
          LEFT JOIN school s ON c.schoolId = s.id
          LEFT JOIN independent i ON c.independentId = i.id
          JOIN state st ON (s.stateId = st.id OR i.stateId = st.id)
          WHERE st.zoneId = ${Number(zoneIdNumber)}
        `;
      });
      
      console.error(`[getZoneStatistics] DEBUG - Basic team check:`, teamCheck);
    } catch (checkError) {
      console.error(`[getZoneStatistics] DEBUG - Error during debug check:`, checkError);
    }
    
    // Return empty results if there's an error
    return {
      zone: zoneData, // Use the locally fetched zone data
      groupedData: [],
      summary: {
        schoolCount: 0,
        teamCount: 0,
        contestantCount: 0,
        contingentCount: 0,
        independentCount: 0
      },
      contingentSummary: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred' // Add error message to result
    };
  }
}
