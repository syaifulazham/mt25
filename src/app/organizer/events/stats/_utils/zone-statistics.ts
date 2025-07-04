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
  rawTeamData?: TeamRawDataItem[]; // For debug purposes
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

export async function getZoneStatistics(zoneId: number): Promise<ZoneStatsResult> {
  // First, get the zone to ensure it exists
  const zone = await prismaExecute<ZoneData | null>((prisma) => prisma.zone.findUnique({
    where: { id: zoneId },
  }));
  if (!zone) {
    throw new Error(`Zone ${zoneId} not found.`);
  }
  
  // Get the active event
  const event = await prismaExecute<{ id: number } | null>((prisma) =>
    prisma.event.findFirst({
      where: { isActive: true },
      select: { id: true },
    })
  );

  if (!event) {
    throw new Error("No active event found.");
  }
  const eventId = event.id;

  // Get cookie for authentication
  const cookieStore = cookies();
  const cookieString = cookieStore.getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
    
  // Fetch raw team data from API
  const apiUrl = new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/api/organizer/events/teams-raw-data`);
  // Using API's scopeArea filter instead of specific eventId
  apiUrl.searchParams.append("zoneId", zoneId.toString());
  apiUrl.searchParams.append("includeEmptyTeams", "false");
  
  const response = await fetch(apiUrl.toString(), {
    headers: {
      "Cookie": cookieString
    },
    cache: "no-store"
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  // Parse the API response
  const apiData = await response.json();
  
  // Check what the API actually returned
  console.log(`[getZoneStatistics] API response structure:`, {
    isArray: Array.isArray(apiData),
    length: Array.isArray(apiData) ? apiData.length : (!Array.isArray(apiData) && apiData.teams ? apiData.teams.length : 'N/A'),
    hasTeamsProperty: !Array.isArray(apiData) && apiData.teams ? true : false
  });
  
  // Log the complete raw data for inspection (use a custom function to avoid console size limits)
  function logTeamData(data: any): void {
    console.log(`[getZoneStatistics] ===== COMPLETE RAW TEAM DATA FOR ZONE ${zoneId} =====`);
    
    // Log overall stats
    const dataToUse = Array.isArray(data) ? data : (data.teams || []);
    
    // Count teams by contest
    const teamsByContest: Record<string, number> = {};
    const teamsByContestLevel: Record<string, number> = {};
    const teamsByState: Record<string, number> = {};
    const teamsByContingent: Record<string, number> = {};
    const teamsByMemberCount: Record<string, number> = {};
    
    for (const team of dataToUse) {
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
    
    console.log(`[getZoneStatistics] TOTAL TEAMS IN RAW DATA: ${dataToUse.length}`);
    console.log(`[getZoneStatistics] Teams by Contest:`, teamsByContest);
    console.log(`[getZoneStatistics] Teams by Contest Level:`, teamsByContestLevel);
    console.log(`[getZoneStatistics] Teams by State:`, teamsByState);
    console.log(`[getZoneStatistics] Teams by Contingent Type:`, teamsByContingent);
    console.log(`[getZoneStatistics] Teams by Member Count:`, teamsByMemberCount);
    
    // Count empty teams
    const emptyTeams = dataToUse.filter((t: TeamRawDataItem) => t.numberOfMembers === 0);
    console.log(`[getZoneStatistics] Teams with no members: ${emptyTeams.length} (${((emptyTeams.length / dataToUse.length) * 100).toFixed(1)}%)`);
    
    // Log first few empty teams for debugging
    if (emptyTeams.length > 0) {
      console.log(`[getZoneStatistics] Sample empty teams:`, emptyTeams.slice(0, 3));
    }
  }
  
  logTeamData(apiData);
  
  // Handle both response formats: array of teams or {teams: [...]} object
  let teamData: TeamRawDataItem[] = [];
  
  if (Array.isArray(apiData)) {
    // API returned array directly
    teamData = apiData;
    console.log(`[getZoneStatistics] API returned array of ${teamData.length} teams directly`);
    // Log the first few items for debugging
    if (teamData.length > 0) {
      console.log(`[getZoneStatistics] Raw team data sample (first 2 items):`, 
        JSON.stringify(teamData.slice(0, 2), null, 2));
      // Log contestLevel values for debugging groups
      const contestLevels = [...new Set(teamData.map(item => item.contestLevel || 'null'))];
      console.log(`[getZoneStatistics] Available contestLevel values:`, contestLevels);
      // Log schoolLevel values
      const schoolLevels = [...new Set(teamData.map(item => item.schoolLevel || 'null'))];
      console.log(`[getZoneStatistics] Available schoolLevel values:`, schoolLevels);
    }
  } else if (apiData && typeof apiData === 'object' && apiData.teams && Array.isArray(apiData.teams)) {
    // API returned {teams: [...]} object
    teamData = apiData.teams;
    console.log(`[getZoneStatistics] API returned object with teams property containing ${teamData.length} teams`);
    // Log the first few items for debugging
    if (teamData.length > 0) {
      console.log(`[getZoneStatistics] Raw team data sample (first 2 items):`, 
        JSON.stringify(teamData.slice(0, 2), null, 2));
      // Log contestLevel values for debugging groups
      const contestLevels = [...new Set(teamData.map(item => item.contestLevel || 'null'))];
      console.log(`[getZoneStatistics] Available contestLevel values:`, contestLevels);
      // Log schoolLevel values
      const schoolLevels = [...new Set(teamData.map(item => item.schoolLevel || 'null'))];
      console.log(`[getZoneStatistics] Available schoolLevel values:`, schoolLevels);
    }
  } else {
    console.error('[getZoneStatistics] API returned unexpected data format', apiData);
    // Return empty results if data format is invalid
    return {
      zone,
      groupedData: [],
      summary: {
        schoolCount: 0,
        teamCount: 0,
        contestantCount: 0,
        contingentCount: 0,
        independentCount: 0
      },
      contingentSummary: []
    };
  }

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

  // We already have the contingent summaries from our helper function

  return {
    zone,
    groupedData,
    summary,
    contingentSummary: stateContingentSummaries,
    rawTeamData: teamData
  };
}
