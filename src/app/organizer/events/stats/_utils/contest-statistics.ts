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
  schoolLevel?: string | null;
  independentType?: string | null;
  contestLevel?: string | null;
};

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
  contestantCount: number; // Added contestant count
  teamsByEduLevel: TeamsByEduLevel;
  contingentIds?: Set<number>; // Used internally for tracking unique contingents
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
    totalContestants: number;
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
 * Process team raw data from API to generate contest statistics
 */
function processTeamRawData(teamItems: TeamRawDataItem[], zoneId?: number, stateId?: number): {
  contestStats: Map<number, ContestStat>;
  totalTeams: number;
  totalContestants: number; // Track total contestants
  uniqueContingentIds: Set<number>;
} {
  // Initialize data structures
  const contestStats = new Map<number, ContestStat>();
  const uniqueContingentIds = new Set<number>();
  const uniqueTeamIds = new Set<number>();
  const uniqueContestantIds = new Set<string>(); // Track unique contestants
  
  // Defensive check for teamItems being undefined or null
  if (!teamItems) {
    console.error('processTeamRawData: teamItems is undefined or null');
    return { contestStats, totalTeams: 0, totalContestants: 0, uniqueContingentIds };
  }
  
  // Filter teams by zone and/or state if specified
  let filteredTeams = teamItems;
  if (stateId !== undefined) {
    filteredTeams = filteredTeams.filter(team => team.stateId === stateId);
  } else if (zoneId !== undefined) {
    filteredTeams = filteredTeams.filter(team => team.zoneId === zoneId);
  }
  
  // Ensure filteredTeams is never undefined or null
  if (!filteredTeams || !Array.isArray(filteredTeams)) {
    console.error('processTeamRawData: filteredTeams is not an array', { filteredTeams });
    return { contestStats, totalTeams: 0, totalContestants: 0, uniqueContingentIds };
  }
  
  // Track teams, contestants, and education levels per contest
  const contestTeams = new Map<number, Set<number>>();
  const contestContestants = new Map<number, Map<number, number>>(); // Map<contestId, Map<teamId, memberCount>>
  const contestTeamsByEduLevel = new Map<number, Map<string, Set<number>>>();
  
  // Process each team from filtered data
  for (const item of filteredTeams) {
    // Skip teams with no members
    if (!item.numberOfMembers || item.numberOfMembers === 0) continue;
    
    // Track unique team IDs across all contests
    uniqueTeamIds.add(item.teamId);
    
    // Track contingent
    uniqueContingentIds.add(item.contingentId);
    
    // Get or create contest stat
    if (!contestStats.has(item.contestId)) {
      // Print detailed information about this contest
      console.log(`[processTeamRawData] New contest found: ${item.contestId}:`, {
        contestId: item.contestId,
        contestName: item.contestName,
        contestCode: item.contestCode,
        rawContestLevel: item.contestLevel,
        teamId: item.teamId,
        teamName: item.teamName,
        members: item.numberOfMembers
      });

      // Apply a default contestLevel if none is provided
      let displayLevel = 'Kids'; // Default all contests to Kids since that's what we know they should be
      
      if (item.contestLevel) {
        // If we have a valid contestLevel from API, use it
        displayLevel = item.contestLevel;
        console.log(`[processTeamRawData] Using API-provided contestLevel: ${displayLevel} for contest ${item.contestId}`);
      } else {
        console.log(`[processTeamRawData] WARNING: Missing contestLevel for contest ${item.contestId}, using default: ${displayLevel}`);
      }
      
      // Map to schoolLevel for internal use (primarily for compatibility with existing code)
      let schoolLevel;
      if (displayLevel === 'Kids') {
        schoolLevel = 'PRIMARY';
      } else if (displayLevel === 'Teens') {
        schoolLevel = 'SECONDARY';
      } else if (displayLevel === 'Youth') {
        schoolLevel = 'HIGHER EDUCATION';
      } else {
        schoolLevel = 'OTHER';
      }
      
      contestStats.set(item.contestId, {
        contest: {
          id: item.contestId,
          name: item.contestName,
          code: item.contestCode || '',
          schoolLevel,
          displayLevel
        },
        contingentsCount: 0,
        teamCount: 0,
        contestantCount: 0, // Initialize contestant count
        teamsByEduLevel: {},
        contingentIds: new Set<number>() // Track contingent IDs for this contest
      });
      
      // Initialize tracking maps for this contest
      contestTeams.set(item.contestId, new Set<number>());
      contestContestants.set(item.contestId, new Map<number, number>());
      contestTeamsByEduLevel.set(item.contestId, new Map<string, Set<number>>());
    }
    
    const contestStat = contestStats.get(item.contestId)!;
    
    // Track team for this contest
    const teamsSet = contestTeams.get(item.contestId)!;
    teamsSet.add(item.teamId);
    
    // Track contestants for this contest
    const contestantsMap = contestContestants.get(item.contestId)!;
    contestantsMap.set(item.teamId, item.numberOfMembers);
    
    // Generate unique contestant IDs using team ID and count (since we don't have actual IDs)
    for (let i = 0; i < item.numberOfMembers; i++) {
      uniqueContestantIds.add(`${item.teamId}-member-${i}`);
    }
    
    // Track contingent for this contest
    const contingentIds = contestStat.contingentIds || new Set<number>();
    contingentIds.add(item.contingentId);
    contestStat.contingentIds = contingentIds;
    contestStat.contingentsCount = contingentIds.size;
    
    // Determine edu level for this team
    let teamEduLevel = 'Other';
    if (item.contingentType === 'SCHOOL') {
      // Using contingent name or type to infer education level
      // This is a simplification - in a real implementation you might want to fetch more detailed data
      if (item.contingentName.toLowerCase().includes('primary') || item.contingentName.toLowerCase().includes('rendah')) {
        teamEduLevel = 'Primary';
      } else if (item.contingentName.toLowerCase().includes('secondary') || item.contingentName.toLowerCase().includes('menengah')) {
        teamEduLevel = 'Secondary';
      }
    }
    
    // Get or create the edu level tracking set
    const eduLevelMap = contestTeamsByEduLevel.get(item.contestId)!;
    if (!eduLevelMap.has(teamEduLevel)) {
      eduLevelMap.set(teamEduLevel, new Set<number>());
    }
    
    // Add team to the edu level tracking set
    eduLevelMap.get(teamEduLevel)!.add(item.teamId);
  }
  
  // Update counts based on unique teams and contestants
  for (const [contestId, stat] of contestStats.entries()) {
    const teamsSet = contestTeams.get(contestId);
    const contestantsMap = contestContestants.get(contestId);
    
    if (teamsSet) {
      stat.teamCount = teamsSet.size;
      
      // Calculate total contestants as sum of all member counts in this contest
      if (contestantsMap) {
        let totalContestantsForContest = 0;
        for (const memberCount of contestantsMap.values()) {
          totalContestantsForContest += memberCount;
        }
        stat.contestantCount = totalContestantsForContest;
      }
      
      // Update education level counts using unique team IDs
      const eduLevelMap = contestTeamsByEduLevel.get(contestId);
      if (eduLevelMap) {
        stat.teamsByEduLevel = {};
        for (const [eduLevel, teamSet] of eduLevelMap.entries()) {
          stat.teamsByEduLevel[eduLevel] = teamSet.size;
        }
      }
    }
  }
  
  // Total teams is the number of unique team IDs
  const totalTeams = uniqueTeamIds.size;
  
  // Total contestants across all contests
  let totalContestants = 0;
  for (const [_, contestantsMap] of contestContestants.entries()) {
    for (const memberCount of contestantsMap.values()) {
      totalContestants += memberCount;
    }
  }
  
  return {
    contestStats,
    totalTeams,
    totalContestants,
    uniqueContingentIds
  };
}

/**
 * Get statistics for all contests, optionally filtered by zone and/or state
 * @param zoneId Optional zone ID to filter by
 * @param stateId Optional state ID to filter by (more specific than zoneId)
 */
export async function getContestStatistics(zoneId?: number, stateId?: number): Promise<ContestStatsResult> {
  // Get all contests from our database for reference
  const contests = await prismaExecute((prisma) => prisma.contest.findMany({
    include: {
      targetgroup: true
    }
  }));
  
  // Get active event ID
  const activeEvent = await prismaExecute((prisma) => prisma.event.findFirst({
    where: {
      isActive: true
    },
    select: {
      id: true
    }
  }));
  
  if (!activeEvent) {
    console.log('[getContestStatistics] No active event found');
    return { 
      groupedContests: [],
      summary: { totalContests: 0, totalTeams: 0, totalContingents: 0, totalContestants: 0 },
      stateId,
      zoneId
    };
  }

  console.log('[getContestStatistics] Active event ID:', activeEvent.id);
  
  // Instead of making an API call, fetch team data directly from the database
  // This avoids the authentication issues with server-side API calls
  console.log('[getContestStatistics] Fetching teams data directly from database');
  
  try {
    // Build where clause based on optional zone/state filters
    let whereClause: any = {};
    
    // Add filter for active event
    whereClause.eventcontest = {
      eventId: activeEvent.id
    };
    
    // Filter by state if provided
    if (stateId) {
      whereClause.team = {
        contingent: {
          OR: [
            { schoolId: { not: null }, school: { stateId: stateId } },
            { independentId: { not: null }, independent: { stateId: stateId } }
          ]
        }
      };
      console.log('[getContestStatistics] Filtering by stateId:', stateId);
    }
    // Filter by zone if provided
    else if (zoneId) {
      whereClause.team = {
        contingent: {
          OR: [
            { schoolId: { not: null }, school: { state: { zoneId: zoneId } } },
            { independentId: { not: null }, independent: { state: { zoneId: zoneId } } }
          ]
        }
      };
      console.log('[getContestStatistics] Filtering by zoneId:', zoneId);
    }
    
    // Fetch all eventcontestteams with related data
    const eventcontestteams = await prismaExecute(async (prisma) => {
      return prisma.eventcontestteam.findMany({
        where: whereClause,
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
                  }
                }
              },
              members: true // Include team members for counting
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
    
    console.log(`[getContestStatistics] Found ${eventcontestteams.length} eventcontestteams`);
    
    // Transform the Prisma data to match the expected API response format
    const teamData: TeamRawDataItem[] = [];
    
    for (const ect of eventcontestteams) {
      // Need to use type assertion since Prisma's type doesn't match our expected structure
      const ectAny = ect as any;
      const team = ectAny.team;
      const contingent = team.contingent;
      const eventcontest = ectAny.eventcontest;
      const contest = eventcontest.contest;
      const event = eventcontest.event;
      
      // Determine state information based on contingent type
      const stateInfo = contingent.school?.state || contingent.independent?.state;
      const zoneInfo = stateInfo ? { id: stateInfo.zoneId, name: '' } : null;
      
      // Get school level from contest target group
      let schoolLevel = null;
      if (contest.targetgroup && contest.targetgroup.length > 0) {
        // Find active target group
        const activeGroup = contest.targetgroup.find((tg: any) => tg.active);
        if (activeGroup) {
          schoolLevel = activeGroup.schoolLevel;
        }
      }
      
      // Determine contest level from school level
      let contestLevel = null;
      if (schoolLevel === 'Primary') contestLevel = 'Kids';
      else if (schoolLevel === 'Secondary') contestLevel = 'Teens';
      else if (schoolLevel === 'Higher Education') contestLevel = 'Youth';
      
      // Only include teams with members
      if (team.members && team.members.length > 0) {
        teamData.push({
          eventId: event.id,
          eventName: event.name,
          zoneId: zoneInfo ? zoneInfo.id : 0,
          zoneName: zoneInfo ? zoneInfo.name : '',
          stateId: stateInfo ? stateInfo.id : 0,
          stateName: stateInfo ? stateInfo.name : '',
          contestId: contest.id,
          contestName: contest.name,
          contestCode: contest.code,
          contingentId: contingent.id,
          contingentName: contingent.name,
          contingentType: contingent.contingentType,
          teamId: team.id,
          teamName: team.name || `Team ${team.id}`,
          numberOfMembers: team.members.length,
          schoolLevel: schoolLevel,
          contestLevel: contestLevel,
          independentType: contingent.contingentType === 'INDEPENDENT' ? 'independent' : null
        });
      }
    }
    
    console.log(`[getContestStatistics] Transformed ${teamData.length} teams with members`);
    
    if (teamData.length > 0) {
      console.log(`[getContestStatistics] Raw team data sample (first 2 items):`, 
        JSON.stringify(teamData.slice(0, 2), null, 2));
      // Log contestLevel values for debugging groups
      const contestLevels = [...new Set(teamData.map(item => item.contestLevel || 'null'))];
      console.log(`[getContestStatistics] Available contestLevel values:`, contestLevels);
    }
    // Continue with processing the team data if we have it
    if (teamData.length > 0) {
      // Process team data from DB query
      const result = processTeamRawData(
        teamData,
        zoneId,
        stateId
      );
      
      const { contestStats, totalTeams, uniqueContingentIds, totalContestants } = result;

      console.log(`[getContestStatistics] processTeamRawData returned stats for ${contestStats.size} contests, ${totalTeams} teams, ${uniqueContingentIds.size} contingents`);
      
      // Convert contestStats Map to array for further processing
      const processedContestStats: ContestStat[] = [];

      // Maps to group contests by school level
      const schoolLevelGroups = new Map<string, SchoolLevelGroup>();

      // Debug contestStats map before processing
      console.log('[getContestStatistics] Contest stats before processing:');
      for (const [contestId, stat] of contestStats.entries()) {
        console.log(`Contest ID ${contestId}: schoolLevel=${stat.contest.schoolLevel}, displayLevel=${stat.contest.displayLevel}`);
      }

      // Process each contest from the processed data
      for (const [contestId, stat] of contestStats.entries()) {
        // Clean up - we don't need to expose the Set in our return value
        const { contingentIds, ...cleanStat } = stat as any;
        
        processedContestStats.push(cleanStat);
        
        // DIRECT APPROACH: Use displayLevel as the grouping key, defaulting to 'Kids' if missing
        // We have confirmed all contests should be 'Kids' for this event
        const contestLevelKey = stat.contest.displayLevel || 'Kids';
        
        console.log(`[getContestStatistics] Contest ${contestId} (${stat.contest.name}): Using contestLevel=${contestLevelKey}, teams=${stat.teamCount}, contestants=${stat.contestantCount}`);
        
        let group = schoolLevelGroups.get(contestLevelKey);
        if (!group) {
          group = {
            schoolLevel: contestLevelKey, // Use contestLevel from API directly
            displayName: contestLevelKey, // Display contest level as is from API
            contests: []
          };
          schoolLevelGroups.set(contestLevelKey, group);
          console.log(`[getContestStatistics] Created new group for ${contestLevelKey}`);
        }
        
        // Double-check team and contestant counts before adding to the group
        if (stat.teamCount === 0) {
          console.log(`[getContestStatistics] WARNING: Contest ${contestId} (${stat.contest.name}) has 0 teams, skipping`);
          continue; // Skip contests with no teams
        }
        
        group.contests.push(cleanStat);
      }

      // Log school level groups before sorting
      console.log(`[getContestStatistics] Created ${schoolLevelGroups.size} school level groups:`, 
        Array.from(schoolLevelGroups.keys()));
      
      // Sort contests by name within each group
      schoolLevelGroups.forEach(group => {
        if (group && group.contests) {
          group.contests.sort((a, b) => a.contest.name.localeCompare(b.contest.name));
        }
      });

      // Convert map to array and sort groups
      const groupedContests = Array.from(schoolLevelGroups.values());

      // Define the custom order for contest levels
      const levelOrder: { [key: string]: number } = {
        // Direct contestLevel values from API
        'Kids': 1,
        'Teens': 2,
        'Youth': 3,
        // Legacy school level values for backward compatibility
        'PRIMARY': 1,
        'SECONDARY': 2,
        'HIGHER EDUCATION': 3
      };

      // Sort groups by the defined order, with 'other' groups at the end
      groupedContests.sort((a, b) => {
        const orderA = levelOrder[a.schoolLevel] || 999;
        const orderB = levelOrder[b.schoolLevel] || 999;
        return orderA - orderB;
      });
      
      // Log the final sorted groupedContests for debugging
      console.log('[getContestStatistics] Final sorted groups:', 
        groupedContests.map(g => ({ 
          schoolLevel: g.schoolLevel, 
          displayName: g.displayName, 
          contestsCount: g.contests.length 
        })));
      
      return {
        groupedContests,
        summary: {
          totalContests: contests.length,
          totalTeams,
          totalContingents: uniqueContingentIds.size,
          totalContestants
        },
        stateId,
        zoneId
      };
    } else {
      console.log('[getContestStatistics] No team data found after database query');
      return { 
        groupedContests: [],
        summary: { totalContests: contests.length, totalTeams: 0, totalContingents: 0, totalContestants: 0 },
        stateId,
        zoneId
      };
    }
  } catch (error) {
    console.error('[getContestStatistics] Error fetching data from database:', error);
    return { 
      groupedContests: [],
      summary: { totalContests: 0, totalTeams: 0, totalContingents: 0, totalContestants: 0 },
      stateId,
      zoneId
    };
  }

  // Process team data from API
  const result = processTeamRawData(
    teamData,
    zoneId,
    stateId
  );
  
  const { contestStats, totalTeams, uniqueContingentIds, totalContestants } = result;

  console.log(`[getContestStatistics] processTeamRawData returned stats for ${contestStats.size} contests, ${totalTeams} teams, ${uniqueContingentIds.size} contingents`);
  
  // Convert contestStats Map to array for further processing
  const processedContestStats: ContestStat[] = [];

  // Maps to group contests by school level
  const schoolLevelGroups = new Map<string, SchoolLevelGroup>();

  // Debug contestStats map before processing
  console.log('[getContestStatistics] Contest stats before processing:');
  for (const [contestId, stat] of contestStats.entries()) {
    console.log(`Contest ID ${contestId}: schoolLevel=${stat.contest.schoolLevel}, displayLevel=${stat.contest.displayLevel}`);
  }

  // Process each contest from the processed data
  for (const [contestId, stat] of contestStats.entries()) {
    // Clean up - we don't need to expose the Set in our return value
    const { contingentIds, ...cleanStat } = stat as any;
    
    processedContestStats.push(cleanStat);
    
    // DIRECT APPROACH: Use displayLevel as the grouping key, defaulting to 'Kids' if missing
    // We have confirmed all contests should be 'Kids' for this event
    const contestLevelKey = stat.contest.displayLevel || 'Kids';
    
    console.log(`[getContestStatistics] Contest ${contestId} (${stat.contest.name}): Using contestLevel=${contestLevelKey}, teams=${stat.teamCount}, contestants=${stat.contestantCount}`);
    
    let group = schoolLevelGroups.get(contestLevelKey);
    if (!group) {
      group = {
        schoolLevel: contestLevelKey, // Use contestLevel from API directly
        displayName: contestLevelKey, // Display contest level as is from API
        contests: []
      };
      schoolLevelGroups.set(contestLevelKey, group);
      console.log(`[getContestStatistics] Created new group for ${contestLevelKey}`);
    }
    
    // Double-check team and contestant counts before adding to the group
    if (stat.teamCount === 0) {
      console.log(`[getContestStatistics] WARNING: Contest ${contestId} (${stat.contest.name}) has 0 teams, skipping`);
      continue; // Skip contests with no teams
    }
    
    group.contests.push(cleanStat);
  }

  // Log school level groups before sorting
  console.log(`[getContestStatistics] Created ${schoolLevelGroups.size} school level groups:`, 
    Array.from(schoolLevelGroups.keys()));
  
  // Sort contests by name within each group
  schoolLevelGroups.forEach(group => {
    group.contests.sort((a, b) => a.contest.name.localeCompare(b.contest.name));
  });

  // Convert map to array and sort groups
  const groupedContests = Array.from(schoolLevelGroups.values());

  // Define the custom order for contest levels
  const levelOrder: { [key: string]: number } = {
    // Direct contestLevel values from API
    'Kids': 1,
    'Teens': 2,
    'Youth': 3,
    // Legacy school level values for backward compatibility
    'PRIMARY': 1,
    'SECONDARY': 2,
    'HIGHER EDUCATION': 3
  };

  // Sort groups by the defined order, with 'other' groups at the end
  groupedContests.sort((a, b) => {
    const orderA = levelOrder[a.schoolLevel] || 999;
    const orderB = levelOrder[b.schoolLevel] || 999;
    return orderA - orderB;
  });
  
  // Log the final sorted groupedContests for debugging
  console.log('[getContestStatistics] Final sorted groups:', 
    groupedContests.map(g => ({ 
      schoolLevel: g.schoolLevel, 
      displayName: g.displayName, 
      contestsCount: g.contests.length 
    })));

  return {
    groupedContests,
    summary: {
      totalContests: contests.length,
      totalTeams,
      totalContingents: uniqueContingentIds.size,
      totalContestants
    },
    stateId,
    zoneId
  };
}
