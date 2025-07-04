import { prismaExecute } from "@/lib/prisma";

/**
 * Types for contest statistics
 */
export type ContestStatsResult = {
  groupedContests: ContestLevelGroup[];
  summary: ContestSummary;
  zoneId?: number;
  stateId?: number;
};

export type ContestSummary = {
  totalContests: number;
  totalContingents: number;
  totalTeams: number;
  totalContestants: number;
};

export type ContestLevelGroup = {
  contestLevel: string;
  contests: ContestItem[];
  totals: {
    contingentCount: number;
    teamCount: number;
    contestantCount: number;
  };
};

export type ContestItem = {
  contestId: number;
  contestName: string;
  contestCode: string;
  contingentCount: number;
  teamCount: number;
  contestantCount: number;
};

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
  contestLevel: string;
};

type FilterClause = {
  eventcontestFilter: Record<string, any>;
  teamFilter: Record<string, any>;
};

type RawEventContestTeam = {
  id: number;
  teamId: number;
  eventcontestId: number;
  team?: any;
  eventcontest?: {
    id: number;
    eventId: number;
    contestId: number;
    contest?: {
      id: number;
      name: string;
      code: string;
      targetgroup?: Array<{ schoolLevel: string; }>
    };
    event?: {
      id: number;
      name: string;
    };
  };
};

/**
 * Create an empty result with standard contest level groups
 */
function getEmptyResult(zoneId?: number, stateId?: number): ContestStatsResult {
  return {
    groupedContests: [
      { contestLevel: 'Kids', contests: [], totals: { contingentCount: 0, teamCount: 0, contestantCount: 0 } },
      { contestLevel: 'Teens', contests: [], totals: { contingentCount: 0, teamCount: 0, contestantCount: 0 } },
      { contestLevel: 'Youth', contests: [], totals: { contingentCount: 0, teamCount: 0, contestantCount: 0 } },
      { contestLevel: 'Other', contests: [], totals: { contingentCount: 0, teamCount: 0, contestantCount: 0 } },
    ],
    summary: {
      totalContests: 0,
      totalContingents: 0,
      totalTeams: 0,
      totalContestants: 0,
    },
    zoneId,
    stateId,
  };
}

/**
 * Get contest statistics for the current active event
 * with optional zone and state filters
 */
export async function getContestStatistics(eventId: number, zoneId?: number, stateId?: number): Promise<ContestStatsResult> {
  console.log(`[getContestStatistics] Fetching all ZONE-level events`);
  const zoneEvents = await prismaExecute((prisma) => prisma.event.findMany({ 
    where: { 
      scopeArea: "ZONE"
    }
  }));
  
  if (!zoneEvents || zoneEvents.length === 0) {
    console.log('[getContestStatistics] No ZONE-level events found');
    return getEmptyResult(zoneId, stateId);
  }
  
  console.log(`[getContestStatistics] Found ${zoneEvents.length} ZONE-level events:`, 
    zoneEvents.map(e => `${e.id}: ${e.name}`));
  
  // Process each zone event
  let allTeamData: TeamRawDataItem[] = [];
  for (const zoneEvent of zoneEvents) {
    console.log(`[getContestStatistics] Processing zone event ${zoneEvent.id}: ${zoneEvent.name}`);
    const filters = buildFilterClause(zoneEvent.id, zoneId, stateId);
    const eventTeamData = await fetchRawTeamData(filters);
    console.log(`[getContestStatistics] Found ${eventTeamData.length} teams for event ${zoneEvent.id}`);
    
    // Add to the combined data
    allTeamData = [...allTeamData, ...eventTeamData];
  }
  
  console.log(`[getContestStatistics] Combined ${allTeamData.length} total teams from all zone events`);
  
  // Use the combined team data from all zone events
  const teamData = allTeamData;
  
  if (!teamData.length) {
    // If no team data was found across any zone events, return empty result
    console.log('[getContestStatistics] No team data found across any zone events');
    return getEmptyResult(zoneId, stateId);
  }
  
  // Process the team data to generate contest statistics
  const result = processTeamData(teamData, zoneId, stateId);
  
  if (!result.groupedContests.length) {
    return getEmptyResult(zoneId, stateId);
  }
  
  return result;
}

/**
 * Build database query filter based on event, zone, and state filters
 */
export function buildFilterClause(eventId: number, zoneId?: number, stateId?: number) {
  // First, build the basic filter for eventcontestteams
  const eventcontestFilter: any = {
    eventId
  };

  // Then build team filter separately
  let teamFilter: any = {};

  if (stateId) {
    teamFilter = {
      contingent: {
        OR: [
          { schoolId: { not: null }, school: { stateId } },
          { independentId: { not: null }, independent: { stateId } }
        ]
      }
    };
    console.log('[buildFilterClause] Filtering by stateId:', stateId);
  } else if (zoneId) {
    teamFilter = {
      contingent: {
        OR: [
          { schoolId: { not: null }, school: { state: { zoneId } } },
          { independentId: { not: null }, independent: { state: { zoneId } } }
        ]
      }
    };
    console.log('[buildFilterClause] Filtering by zoneId:', zoneId);
  }
  
  // Log complete filter for debugging
  console.log('[buildFilterClause] Built filters:', {
    eventId,
    zoneId,
    stateId,
    eventcontestFilter,
    teamFilter: JSON.stringify(teamFilter)
  });

  return { eventcontestFilter, teamFilter };
}

/**
 * Fetch raw team data from database based on filter criteria
 */
export async function fetchRawTeamData(filters: { eventcontestFilter: any, teamFilter: any }): Promise<TeamRawDataItem[]> {
  console.log('[fetchRawTeamData] Starting data fetch with filters:', JSON.stringify(filters, null, 2));
  
  // First, check if we have any teams at all to verify database access
  const teamCount = await prismaExecute(async (prisma) => {
    return prisma.team.count();
  });
  
  console.log(`[fetchRawTeamData] Total teams in database: ${teamCount}`);
  
  // Get all eventcontests for this event
  const eventcontests = await prismaExecute(async (prisma) => {
    return prisma.eventcontest.findMany({
      where: filters.eventcontestFilter,
      include: {
        event: true,
        contest: { include: { targetgroup: true } }
      }
    });
  });
  
  console.log(`[fetchRawTeamData] Found ${eventcontests.length} eventcontests for this event`);
  
  if (eventcontests.length === 0) {
    console.log('[fetchRawTeamData] No eventcontests found for this event');
    return [];
  }
  
  // Then find all eventcontestteams linking the eventcontests and teams
  const eventcontestteams: any[] = await prismaExecute(async (prisma) => {
    return prisma.eventcontestteam.findMany({
      where: {
        eventcontestId: { in: eventcontests.map((ec: any) => ec.id) },
        ...(Object.keys(filters.teamFilter).length > 0 ? { team: filters.teamFilter } : {})
      },
      select: {
        id: true,
        teamId: true,
        eventcontestId: true
      }
    });
  });
  
  console.log(`[fetchRawTeamData] Found ${eventcontestteams.length} eventcontestteams matching filter`);
  
  if (eventcontestteams.length === 0) {
    console.log('[fetchRawTeamData] No event contest teams found matching filter');
    return [];
  }
  
  // Get team IDs and eventcontest IDs to use in follow-up queries
  const teamIds: number[] = eventcontestteams.map((ect: any) => ect.teamId);
  const eventcontestIds: number[] = eventcontestteams.map((ect: any) => ect.eventcontestId);
  
  console.log(`[fetchRawTeamData] Found ${teamIds.length} unique team IDs`);
  
  // Get teams with their contingents and members
  const teams = await prismaExecute(async (prisma) => {
    return prisma.team.findMany({
      where: { id: { in: teamIds } },
      include: {
        members: true,
        contingent: {
          include: {
            school: { include: { state: { include: { zone: true } } } },
            independent: { include: { state: { include: { zone: true } } } }
          }
        }
      }
    });
  });
    
  // Get specific eventcontests by IDs with their contests
  const matchedEventContests = await prismaExecute(async (prisma) => {
    return prisma.eventcontest.findMany({
      where: { id: { in: eventcontestIds } },
      include: {
        event: true,
        contest: { include: { targetgroup: true } }
      }
    });
  });
    
  console.log(`[fetchRawTeamData] Retrieved ${teams?.length || 0} teams and ${matchedEventContests?.length || 0} eventcontests`);
  
  // Map the data to our expected format
  const teamDataItems: TeamRawDataItem[] = [];
  
  for (const ect of eventcontestteams) {
    const team = teams.find(t => t.id === ect.teamId);
    const eventcontest = matchedEventContests.find(ec => ec.id === ect.eventcontestId);
    
    if (!team || !eventcontest) {
      console.log(`[fetchRawTeamData] Missing team or eventcontest for ect ${ect.id}`);
      continue;
    }
    
    // Handle both school and independent contingents
    const contingent = team.contingent;
    if (!contingent) {
      console.log(`[fetchRawTeamData] Team ${team.id} has no contingent`);
      continue;
    }
    
    // Get state and zone info based on contingent type
    let stateId = 0;
    let stateName = 'Unknown';
    let zoneId = 0;
    let zoneName = 'Unknown';
    
    if (contingent.school) {
      stateId = contingent.school.state?.id || 0;
      stateName = contingent.school.state?.name || 'Unknown';
      zoneId = contingent.school.state?.zone?.id || 0;
      zoneName = contingent.school.state?.zone?.name || 'Unknown';
    } else if (contingent.independent) {
      stateId = contingent.independent.state?.id || 0;
      stateName = contingent.independent.state?.name || 'Unknown';
      zoneId = contingent.independent.state?.zone?.id || 0;
      zoneName = contingent.independent.state?.zone?.name || 'Unknown';
    }
    
    // Get contest level from targetgroup
    const schoolLevel = eventcontest.contest.targetgroup[0]?.schoolLevel || null;
    let contestLevel = 'Other';
    
    // Map schoolLevel to contestLevel as we do in our existing code
    if (schoolLevel) {
      if (schoolLevel.includes('Primary') || schoolLevel.includes('Rendah')) {
        contestLevel = 'Kids';
      } else if (schoolLevel.includes('Secondary') || schoolLevel.includes('Menengah')) {
        contestLevel = 'Teens';
      } else if (schoolLevel.includes('Youth')) {
        contestLevel = 'Youth';
      }
    }
    
    // Create the team data item
    teamDataItems.push({
      eventId: eventcontest.event.id,
      eventName: eventcontest.event.name,
      zoneId,
      zoneName,
      stateId,
      stateName,
      contestId: eventcontest.contest.id,
      contestName: eventcontest.contest.name,
      contestCode: eventcontest.contest.code,
      contingentId: contingent.id,
      contingentName: contingent.name,
      contingentType: contingent.contingentType,
      teamId: team.id,
      teamName: team.name,
      numberOfMembers: team.members.length,
      contestLevel
    });
    }
    
  console.log(`[fetchRawTeamData] Processed ${teamDataItems.length} team data items`);
  return teamDataItems;
}

/**
 * Constructs team data manually from a direct database query result
 * This is a fallback for when the normal query process fails
 */
async function constructTeamDataFromSample(directCheckResult: any[], eventId: number): Promise<TeamRawDataItem[]> {
  console.log(`[constructTeamDataFromSample] Attempting to construct team data from ${directCheckResult.length} sample results`);
  
  const teamData: TeamRawDataItem[] = [];
  
  for (const ect of directCheckResult) {
    try {
      if (!ect.team || !ect.eventcontest || !ect.eventcontest.contest) {
        console.log('[constructTeamDataFromSample] Missing required relation in sample data');
        continue;
      }
      
      // Get state and zone info based on contingent type
      let stateId = 0;
      let stateName = 'Unknown';
      let zoneId = 0;
      let zoneName = 'Unknown';
      
      // Handle contingent
      const team = ect.team;
      const contingent = team.contingent;
      
      if (!contingent) {
        console.log(`[constructTeamDataFromSample] Team ${team.id} has no contingent`);
        continue;
      }
      
      // Get state and zone data
      await prismaExecute(async (prisma) => {
        if (contingent.schoolId) {
          const school = await prisma.school.findUnique({
            where: { id: contingent.schoolId },
            include: { state: { include: { zone: true } } }
          });
          
          if (school?.state) {
            stateId = school.state.id;
            stateName = school.state.name;
            
            if (school.state.zone) {
              zoneId = school.state.zone.id;
              zoneName = school.state.zone.name;
            }
          }
        } else if (contingent.independentId) {
          const independent = await prisma.independent.findUnique({
            where: { id: contingent.independentId },
            include: { state: { include: { zone: true } } }
          });
          
          if (independent?.state) {
            stateId = independent.state.id;
            stateName = independent.state.name;
            
            if (independent.state.zone) {
              zoneId = independent.state.zone.id;
              zoneName = independent.state.zone.name;
            }
          }
        }
      });
      
      // Determine contest level based on target group
      let contestLevel = 'Other';
      const schoolLevel = ect.eventcontest.contest.targetgroup?.schoolLevel;
      
      if (schoolLevel) {
        if (schoolLevel.includes('Primary') || schoolLevel.includes('Rendah')) {
          contestLevel = 'Kids';
        } else if (schoolLevel.includes('Secondary') || schoolLevel.includes('Menengah')) {
          contestLevel = 'Teens';
        } else if (schoolLevel.includes('Youth')) {
          contestLevel = 'Youth';
        }
      }
      
      // Create the team data item
      teamData.push({
        eventId,
        eventName: ect.eventcontest.event?.name || 'Unknown Event',
        zoneId,
        zoneName,
        stateId,
        stateName,
        contestId: ect.eventcontest.contest.id,
        contestName: ect.eventcontest.contest.name,
        contestCode: ect.eventcontest.contest.code || ect.eventcontest.contest.name.substring(0, 3).toUpperCase(),
        contingentId: contingent.id,
        contingentName: contingent.name,
        contingentType: contingent.contingentType,
        teamId: team.id,
        teamName: team.name,
        numberOfMembers: team.members?.length || 0,
        contestLevel
      });
    } catch (error) {
      console.error('[constructTeamDataFromSample] Error processing sample item:', error);
    }
  }
  
  console.log(`[constructTeamDataFromSample] Constructed ${teamData.length} team data items`);
  return teamData;
}

/**
 * Process team data to generate contest statistics grouped by contestLevel
 */
function processTeamData(teamData: TeamRawDataItem[], zoneId?: number, stateId?: number): ContestStatsResult {
  // Track unique contests, contingents by contest, teams, and contestants
  const contestsMap = new Map<number, ContestItem>();
  const contestContingentMap = new Map<number, Set<number>>();
  const uniqueContingentIds = new Set<number>();
  const uniqueTeamIds = new Set<number>();
  let totalContestants = 0;
  
  // Process each team item
  for (const team of teamData) {
    // Track unique IDs
    uniqueContingentIds.add(team.contingentId);
    uniqueTeamIds.add(team.teamId);
    totalContestants += team.numberOfMembers;
    
    // If we haven't seen this contest before, add it to our map
    if (!contestsMap.has(team.contestId)) {
      contestsMap.set(team.contestId, {
        contestId: team.contestId,
        contestName: team.contestName,
        contestCode: team.contestCode,
        contingentCount: 0,
        teamCount: 0,
        contestantCount: 0
      });
      contestContingentMap.set(team.contestId, new Set());
    }
    
    // Track contingents per contest
    const contingentSet = contestContingentMap.get(team.contestId)!;
    contingentSet.add(team.contingentId);
  }
  
  // Calculate stats for each contest
  for (const [contestId, contingentSet] of contestContingentMap.entries()) {
    const contest = contestsMap.get(contestId)!;
    const teamsInContest = teamData.filter(t => t.contestId === contestId);
    
    contest.contingentCount = contingentSet.size;
    contest.teamCount = teamsInContest.length;
    contest.contestantCount = teamsInContest.reduce((sum, t) => sum + t.numberOfMembers, 0);
  }
  
  // Group contests by level
  const levelGroups = new Map<string, ContestLevelGroup>();
  
  for (const contest of contestsMap.values()) {
    // Get contest level from the first matching team
    const team = teamData.find(t => t.contestId === contest.contestId);
    const level = team?.contestLevel || 'Other';
    
    if (!levelGroups.has(level)) {
      levelGroups.set(level, {
        contestLevel: level,
        contests: [],
        totals: {
          contingentCount: 0,
          teamCount: 0,
          contestantCount: 0
        }
      });
    }
    
    const group = levelGroups.get(level)!;
    group.contests.push(contest);
    group.totals.teamCount += contest.teamCount;
    group.totals.contestantCount += contest.contestantCount;
  }
  
  // Calculate unique contingent count per level group
  for (const group of levelGroups.values()) {
    const levelContingentIds = new Set<number>();
    
    // Get all team data for this level's contests
    const contestCodes = group.contests.map(c => c.contestCode);
    const levelTeams = teamData.filter(t => contestCodes.includes(t.contestCode));
    
    // Count unique contingents in this level
    levelTeams.forEach(t => levelContingentIds.add(t.contingentId));
    group.totals.contingentCount = levelContingentIds.size;
  }
  
  // Sort contests within each group by code+name
  for (const group of levelGroups.values()) {
    group.contests.sort((a, b) => {
      const codeA = a.contestCode || '';
      const codeB = b.contestCode || '';
      return codeA === codeB 
        ? a.contestName.localeCompare(b.contestName) 
        : codeA.localeCompare(codeB);
    });
  }
  
  // Convert to array and sort groups
  const contestGroups = Array.from(levelGroups.values());
  const levelOrder: Record<string, number> = { 'Kids': 1, 'Teens': 2, 'Youth': 3, 'Other': 4 };
  
  contestGroups.sort((a, b) => {
    const orderA = levelOrder[a.contestLevel] || 99;
    const orderB = levelOrder[b.contestLevel] || 99;
    return orderA - orderB;
  });
  
  // Ensure all groups have the proper property format
  for (const group of contestGroups) {
    if (!('contests' in group)) {
      (group as ContestLevelGroup).contests = [];
    }
  }

  // Add missing contestLevel groups if not present in results
  const standardLevels = ['Kids', 'Teens', 'Youth', 'Other'];
  const existingLevels = new Set(contestGroups.map(g => g.contestLevel));
  
  standardLevels.forEach(level => {
    if (!existingLevels.has(level)) {
      contestGroups.push({ 
        contestLevel: level, 
        contests: [],
        totals: {
          contingentCount: 0,
          teamCount: 0,
          contestantCount: 0
        } 
      });
    }
  });
  
  // Sort the groups by level (Kids -> Teens -> Youth -> Other)
  contestGroups.sort((a, b) => {
    const levelOrder: Record<string, number> = { 'Kids': 0, 'Teens': 1, 'Youth': 2, 'Other': 3 };
    return (levelOrder[a.contestLevel] ?? 99) - (levelOrder[b.contestLevel] ?? 99);
  });

  // Log summary for debugging
  console.log(`[getContestStatistics] Processed stats: ${contestsMap.size} contests, ${uniqueTeamIds.size} teams, ${uniqueContingentIds.size} contingents, ${levelGroups.size} groups`);

  // Create a result object with contest groups and summary
  const result: ContestStatsResult = {
    groupedContests: contestGroups,
    summary: {
      totalContests: contestsMap.size,
      totalContingents: uniqueContingentIds.size,
      totalTeams: uniqueTeamIds.size,
      totalContestants
    },
    zoneId,
    stateId
  };

  console.log(`[processTeamData] Result summary:`, {
    groupCount: result.groupedContests.length,
    contestCount: result.summary.totalContests,
    teamCount: result.summary.totalTeams,
    contingentCount: result.summary.totalContingents
  });

  if (result.groupedContests.length > 0) {
    console.log(`[processTeamData] First group:`, {
      contestLevel: result.groupedContests[0].contestLevel,
      contestCount: result.groupedContests[0].contests.length
    });
  } else {
    console.log('[processTeamData] No contest groups found!');
  }

  return result;
}
