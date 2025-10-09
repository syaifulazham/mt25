import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Function to create SHA-256 hash from IC, eventId, and contingentId
function createHashcode(ic: string, eventId: number, contingentId: number, additionalId?: string | number, role?: string): string {
  // Add timestamp for additional entropy
  const timestamp = Date.now();
  
  // Add random component for extra uniqueness
  const randomComponent = Math.random().toString(36).substring(2, 15);
  
  // Combine all inputs with separators for maximum uniqueness
  const input = `${ic || 'no-ic'}-${eventId}-${contingentId}-${additionalId || 'no-id'}-${role || 'unknown'}-${timestamp}-${randomComponent}`;
  
  // Create SHA-256 hash
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function POST(request: NextRequest, { params }: { params: { eventId: string } }) {
  const now = new Date();
  const eventId = parseInt(params.eventId);
  
  try {
    // Verify user is authorized for this operation
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.role || !['ADMIN', 'OPERATOR', 'admin', 'operator'].includes(session.user.role)) {
      return new NextResponse(JSON.stringify({
        error: 'Unauthorized. Only admins and operators can sync attendance.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Sync Results to track operation statistics
    interface SyncResults {
      totalContingents: number;
      newContingents: number;
      updatedContingents: number;
      totalTeams: number;
      newTeams: number;
      updatedTeams: number;
      totalContestants: number;
      newContestants: number;
      updatedContestants: number;
      totalManagers: number;
      newManagers: number;
      updatedManagers: number;
      errorCount: number;
      errors: string[];
    }

    const syncResults: SyncResults = {
      totalContingents: 0,
      newContingents: 0,
      updatedContingents: 0,
      totalTeams: 0,
      newTeams: 0,
      updatedTeams: 0,
      totalContestants: 0,
      newContestants: 0,
      updatedContestants: 0,
      totalManagers: 0,
      newManagers: 0,
      updatedManagers: 0,
      errorCount: 0,
      errors: [] as string[]
    };

    // Validate parameters
    const eventIdParam = eventId;
    if (!eventIdParam || isNaN(eventIdParam)) {
      return new NextResponse(JSON.stringify({
        error: 'Invalid or missing eventId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure event exists
    const event = await prisma.event.findUnique({
      where: {
        id: eventId
      }
    });
    
    if (!event) {
      return new NextResponse(JSON.stringify({
        error: `Event with ID ${eventId} not found`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Query teams with related data for the given event
    console.log(`Starting attendance sync for event ${eventId}`);

    // Phase 1: Get data for teams, contingents, and participants
    try {
      // SQL query with explicit field naming for contest details
      const teamsQuery = `
        SELECT 
          t.id,
          t.name as teamName,
          t.contestId as originalContestId,
          c.id as contingentId,
          /* Get contest details directly from team's contestId for attendance records */
          team_contest.id as contestId,
          team_contest.code as contestCode,
          team_contest.name as contestName,
          MAX(ect.status) as status,
          MAX(ect.createdAt) as registrationDate,
          MAX(CASE 
              WHEN c.contingentType = 'SCHOOL' THEN s.name
              WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN hi.name
              WHEN c.contingentType = 'INDEPENDENT' THEN i.name
              ELSE 'Unknown'
          END) as contingentName,
          MAX(c.contingentType) as contingentType,
          MAX(tg.schoolLevel) as schoolLevel,
          MAX(tg.minAge) as minAge,
          MAX(tg.maxAge) as maxAge,
          MAX(CASE 
            WHEN tg.schoolLevel = 'Primary' THEN 'Kids'
            WHEN tg.schoolLevel = 'Secondary' THEN 'Teens'
            WHEN tg.schoolLevel = 'Higher Education' THEN 'Youth'
            ELSE tg.schoolLevel
          END) as targetGroupLabel,
          MAX(CASE 
            WHEN c.contingentType = 'SCHOOL' THEN st_s.name
            WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN st_hi.name
            WHEN c.contingentType = 'INDEPENDENT' THEN st_i.name
            ELSE 'Unknown State'
          END) as stateName,
          MAX(CASE 
            WHEN c.contingentType = 'SCHOOL' THEN st_s.id
            WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN st_hi.id
            WHEN c.contingentType = 'INDEPENDENT' THEN st_i.id
            ELSE NULL
          END) as stateId,
          MAX(CASE 
            WHEN c.contingentType = 'SCHOOL' THEN z_s.id
            WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN z_hi.id
            WHEN c.contingentType = 'INDEPENDENT' THEN z_i.id
            ELSE NULL
          END) as zoneId,
          MAX(CASE 
            WHEN c.contingentType = 'SCHOOL' THEN s.ppd
            WHEN c.contingentType = 'INDEPENDENT' THEN 'INDEPENDENT'
            ELSE 'Unknown PPD'
          END) as ppd,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', m.id,
              'name', m.name,
              'email', m.email,
              'phoneNumber', m.phoneNumber,
              'ic', m.ic,
              'hashcode', m.hashcode
            )
          ) as managers
        FROM eventcontestteam ect
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        JOIN team t ON ect.teamId = t.id
        JOIN contest team_contest ON t.contestId = team_contest.id  /* Direct join from team to contest (for attendance records) */
        LEFT JOIN manager_team mt ON mt.teamId = t.id
        LEFT JOIN manager m ON m.id = mt.managerId
        JOIN contingent c ON t.contingentId = c.id
        JOIN contest ct ON ec.contestId = ct.id  /* Join to get event contest (for target groups) */
        JOIN _contesttotargetgroup ctg ON ctg.A = ct.id
        JOIN targetgroup tg ON tg.id = ctg.B
        LEFT JOIN school s ON c.schoolId = s.id
        LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
        LEFT JOIN independent i ON c.independentId = i.id
        LEFT JOIN state st_s ON s.stateId = st_s.id
        LEFT JOIN state st_hi ON hi.stateId = st_hi.id
        LEFT JOIN state st_i ON i.stateId = st_i.id
        LEFT JOIN zone z_s ON st_s.zoneId = z_s.id
        LEFT JOIN zone z_hi ON st_hi.zoneId = z_hi.id
        LEFT JOIN zone z_i ON st_i.zoneId = z_i.id
        WHERE ec.eventId = ? AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
        GROUP BY t.id, mt.teamId, m.id, team_contest.id, team_contest.code, team_contest.name
      `;

      // Execute the query with the event ID parameter
      const teams = await prisma.$queryRawUnsafe(teamsQuery, eventIdParam) as any[];
      
      // Get team members for each team
      const teamsWithMembers = await Promise.all(
        teams.map(async (team) => {
          // Explicitly preserve contest fields from the SQL query
          const contestId = team.contestId;
          const contestCode = team.contestCode;
          const contestName = team.contestName;
          
          // Use parameterized query for consistency and security
          const membersQuery = `
            SELECT 
              con.id,
              con.name as participantName,
              con.contingentId,
              con.email,
              con.ic,
              con.edu_level,
              con.class_grade,
              con.age,
              team_contest.id as contestId,
              team_contest.code as contestCode,
              team_contest.name as contestName,
              CASE 
                WHEN LOWER(con.class_grade) = 'ppki' THEN con.class_grade
                WHEN con.edu_level = 'sekolah rendah' THEN CONCAT('Darjah ', COALESCE(con.class_grade, ''))
                WHEN con.edu_level = 'sekolah menengah' THEN CONCAT('Tingkatan ', COALESCE(con.class_grade, ''))
                ELSE CONCAT('Darjah/ Tingkatan ', COALESCE(con.class_grade, ''))
              END as formattedClassGrade,
              CASE 
                WHEN c.contingentType = 'SCHOOL' THEN s.name
                WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN hi.name
                WHEN c.contingentType = 'INDEPENDENT' THEN i.name
                ELSE 'Unknown'
              END as contingentName,
              c.contingentType as contingentType
            FROM teamMember tm
            JOIN contestant con ON tm.contestantId = con.id
            JOIN contingent c ON con.contingentId = c.id
            LEFT JOIN school s ON c.schoolId = s.id
            LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
            LEFT JOIN independent i ON c.independentId = i.id
            LEFT JOIN team t ON tm.teamId = t.id
            JOIN contest team_contest ON t.contestId = team_contest.id
            WHERE tm.teamId = ?
            ORDER BY con.name ASC
          `;
          
          const members = await prisma.$queryRawUnsafe(membersQuery, team.id) as any[];

          return {
            ...team,
            members: members || []
          };
        })
      );

      console.log(`teamsWithMembers:`, teamsWithMembers)
     // teamsWithMembers.forEach(team => {
     //   console.log(`Team ${team.teamName} has ${team.members.length} members`);
     //   console.log(team.members);
     // });

      // Debug the teamsWithMembers to check if members arrays exist
      console.log(`DETAILED MEMBERS DEBUG: Total teams with members: ${teamsWithMembers.length}`);
      if (teamsWithMembers.length > 0) {
        const teamMembersSummary = teamsWithMembers.map(team => ({
          teamId: team.id,
          teamName: team.name,
          hasMembersArray: Array.isArray(team.members),
          membersCount: team.members ? team.members.length : 0,
          contestId: team.contestId,
          contestName: team.contestName
        }));
        console.log('TEAMS WITH MEMBERS SUMMARY:', JSON.stringify(teamMembersSummary.slice(0, 3)));
        
        // Log first team's members detail if available
        if (teamsWithMembers[0]?.members && teamsWithMembers[0].members.length > 0) {
          console.log('FIRST TEAM MEMBER EXAMPLE:', JSON.stringify(teamsWithMembers[0].members[0]));
        } else {
          console.log('FIRST TEAM HAS NO MEMBERS');
        }
      }

      // Debug to verify contest fields are preserved in teamsWithMembers
      console.log(`TRANSFORM DEBUG: First team contest fields:`, {
        teamId: teamsWithMembers[0]?.id,
        contestId: teamsWithMembers[0]?.contestId,
        contestCode: teamsWithMembers[0]?.contestCode,
        contestName: teamsWithMembers[0]?.contestName
      });
      
      // CRITICAL FIX: Replace any existing teamsData variable with teamsWithMembers to ensure we have member arrays
      // Log confirmation of members availability before proceeding
      console.log('BEFORE FILTERING: Teams with >0 members:', teamsWithMembers.filter(t => t.members && t.members.length > 0).length);
      const membersCount = teamsWithMembers.reduce((sum, team) => sum + (team.members?.length || 0), 0);
      console.log(`TOTAL MEMBER COUNT BEFORE FILTERING: ${membersCount}`);
      
      // Filter out teams with zero members only - no longer filter by age validation
      // This matches the behavior in sync-contingent route
      const filteredTeams = teamsWithMembers.filter(team => {
        // Filter out teams with no members
        if (!team.members || !Array.isArray(team.members) || team.members.length === 0) {
          console.log(`SKIPPING: Team ${team.id} (${team.name || 'unnamed'}) has no members - will not be processed`);
          return false; // Exclude teams without members from sync
        }
        
        // Track age validation issues for reporting but don't filter teams
        const minAge = team.minAge || 0;
        const maxAge = team.maxAge || 100;
        
        const allMembersInRange = team.members.every((member: any) => {
          const age = member.age || 0;
          return age >= minAge && age <= maxAge;
        });
        
        if (!allMembersInRange) {
          console.log(`Team ${team.id} has age validation issues but will still be synced as requested`);
        }
        
        // Include all teams with members regardless of age validation
        return true;
      });
      
      // Debug to verify filteredTeams
      console.log(`FILTER DEBUG: Before: ${teamsWithMembers.length}, After: ${filteredTeams.length}`);
      console.log('MEMBERS CHECK: First filtered team has members:', filteredTeams[0]?.members ? `Yes (${filteredTeams[0].members.length})` : 'No');
      
      // Check how many teams still have members after filtering
      const teamsWithMembersAfterFilter = filteredTeams.filter(t => t.members && t.members.length > 0).length;
      console.log(`AFTER FILTERING: Teams with >0 members: ${teamsWithMembersAfterFilter}`);
      const membersCountAfter = filteredTeams.reduce((sum, team) => sum + (team.members?.length || 0), 0);
      console.log(`TOTAL MEMBER COUNT AFTER FILTERING: ${membersCountAfter}`);

      // Log filtering results
      console.log(`Teams before age filtering: ${teamsWithMembers.length}, after: ${filteredTeams.length}`);
      
      // Set the base data for our teamsData array
      const teamsData = filteredTeams.map(team => {
        // Get the first team to extract its data
        const firstTeam = team;
        return {
          id: firstTeam.id,
          teamName: firstTeam.teamName,
          originalContestId: firstTeam.originalContestId,
          contestId: firstTeam.contestId,
          contestCode: firstTeam.contestCode,
          contestName: firstTeam.contestName,
          contingentId: firstTeam.contingentId,
          contingentName: firstTeam.contingentName,
          contingentType: firstTeam.contingentType,
          schoolLevel: firstTeam.schoolLevel,
          targetGroupLabel: firstTeam.targetGroupLabel,
          stateName: firstTeam.stateName,
          stateId: firstTeam.stateId,
          zoneId: firstTeam.zoneId,
          ppd: firstTeam.ppd,
          members: team.members || [],
          // Parse managers JSON if needed
          managers: typeof team.managers === 'string' ? JSON.parse(team.managers) : team.managers,
        };
      });

      // Group teams by contingent to create a structure similar to our original
      const contingentMap = new Map();
      
      // Debug how many teams still have members before grouping
      const teamsWithMembersBeforeGroup = teamsData.filter(t => t.members && t.members.length > 0).length;
      console.log(`BEFORE GROUPING: Teams with >0 members: ${teamsWithMembersBeforeGroup}`);
      
      // Process teams to group by contingent
      teamsData.forEach((team: any) => {
        if (!team.id || !team.contingentName) return;
        
        // Extract contingent info from the first team member if available
        const firstMember = team.members && team.members[0];
        const contingentInfo = {
          name: team.contingentName,
          type: team.contingentType || (firstMember ? firstMember.contingentType : null),
        };
        
        // Get or create the contingent entry using actual numeric contingentId
        const contingentId = team.contingentId;
        if (!contingentId) {
          console.error(`Missing contingentId for team ${team.id} (${team.teamName})`);
          return; // Skip this team if no contingentId
        }
        
        // Create contingent entry in contingentMap if not exists
        let contingentEntry = contingentMap.get(contingentId);
        if (!contingentEntry) {
          contingentEntry = {
            id: contingentId, // Use the actual numeric contingent ID
            name: team.contingentName,
            type: contingentInfo.type,
            stateId: team.stateId,
            state: team.stateName,
            zoneId: team.zoneId,
            teams: []
          };
          contingentMap.set(contingentId, contingentEntry);
        }
        
        // Process managers if available
        const managers = team.managers ? 
          (Array.isArray(team.managers) ? team.managers : JSON.parse(team.managers)) : [];
          
        // Add this team to the contingent
        contingentEntry.teams.push({
          id: team.id,
          name: team.teamName,
          status: team.status,
          schoolLevel: team.schoolLevel,
          targetGroupLabel: team.targetGroupLabel,
          stateName: team.stateName,
          stateId: team.stateId,
          zoneId: team.zoneId,
          ppd: team.ppd,
          contestId: team.contestId,
          contestName: `${team.contestCode} ${team.contestName}`,
          contestGroup: team.targetGroupLabel,
          contestants: team.members.map((member: any) => ({
            id: member.id,
            participantId: member.id,  // Use the member ID as participantId
            contingentId: member.contingentId || team.contingentId, // Use the contestant's contingentId or team's contingentId
            name: member.participantName,
            age: member.age,
            email: member.email,
            ic: member.ic,
            contestId: member.contestId,
            contestName: member.contestCode + ' ' + member.contestName,
            contestGroup: team.targetGroupLabel
          })),
          managers: managers.filter(Boolean).map((manager: any) => ({
            id: manager.id,
            name: manager.name,
            email: manager.email,
            phoneNumber: manager.phoneNumber,
            ic: manager.ic,
            hashcode: manager.hashcode,
            contestGroup: manager.id ? team.targetGroupLabel : null
          }))
        });
      });
      
      // Convert the map to an array of contingents
      const processedContingents = Array.from(contingentMap.values());
      
      // Debug to see if teams in contingents still have members arrays
      let totalTeamsCount = 0;
      let teamsWithContestantsCount = 0;
      let totalContestantsCount = 0;
      
      processedContingents.forEach(contingent => {
        if (!contingent.teams) return;
        
        totalTeamsCount += contingent.teams.length;
        contingent.teams.forEach((teamObj: any) => {
          if (teamObj.contestants && teamObj.contestants.length) {
            teamsWithContestantsCount++;
            totalContestantsCount += teamObj.contestants.length;
          }
        });
      });
      
      console.log(`AFTER CONTINGENT GROUPING: Total teams: ${totalTeamsCount}, Teams with contestants: ${teamsWithContestantsCount}, Total contestants: ${totalContestantsCount}`);
      console.log('-------------------------CONTINGENT--  -------------------------\n');
      processedContingents.forEach((c: any) => {
        console.log(`DEBUG: Contingent ID: ${c.id}, teams count: ${c.teams.length}`);
        c.teams.forEach((t: any) => {
          console.log('TEAM -->',t);
        });
      });
      // Log the result with detailed debug info
      console.log(`DEBUG: Processed ${processedContingents.length} contingents with ${teamsData.length} teams for attendance sync`);
      console.log(`DEBUG: First contingent teams count: ${processedContingents[0]?.teams.length || 0}`);
      console.log(`DEBUG: First contingent ID: ${processedContingents[0]?.id || 'none'}`);
      
      // Debug the team.members vs team.contestants issue
      if (processedContingents[0]?.teams[0]) {
        const firstTeam = processedContingents[0].teams[0];
        console.log(`DEBUG: First team ID: ${firstTeam.id}, name: ${firstTeam.name}`);
        console.log(`DEBUG: First team contestants structure: ${JSON.stringify({
          membersCount: firstTeam.contestants?.length || 0,
          hasContestId: firstTeam.contestants?.[0]?.contestId ? true : false
        })}`);
      }
      
      // Create sync status record
      await prisma.eventAttendanceSync.create({
        data: {
          eventId,
          status: 'processing',
          startTime: now,
          totalContingents: processedContingents.length,
          totalTeams: teamsData.length,
          completedCount: 0,
          errorCount: 0,
          note: 'Starting sync',
        }
      });

      // Perform sync operation with explicit error handling and extra debugging
      console.log(`DEBUG: Starting sync with ${processedContingents.length} contingents`);
      
      // Check if we have any teams at all
      let totalTeamsInStructure = 0;
      let totalContestantsInStructure = 0;
      let totalMembers = 0;
      processedContingents.forEach(contingent => {
        if (contingent.teams) {
          totalTeamsInStructure += contingent.teams.length;
          contingent.teams.forEach((team: any) => {
            // Check both team.contestants (older format) and team.members (new format)
            if (team.contestants) totalContestantsInStructure += team.contestants.length;
            if (team.members) totalMembers += team.members.length;
          });
        }
      });
      console.log(`DEBUG: Total teams in structure: ${totalTeamsInStructure}, total contestants: ${totalContestantsInStructure}, total members: ${totalMembers}`);
      
      try {
        // Set initial counters
        syncResults.totalContingents = processedContingents.length;
        syncResults.errorCount = 0; // Add errorCount property to fix TypeScript errors
        console.log(`Processing ${syncResults.totalContingents} contingents`);
        
        // Track processed managers to avoid duplicates
        const processedManagerIds = new Set<number>();
          
        // Process each contingent
        for (const contingent of processedContingents) {
          const contingentId = contingent.id;
          
          console.log(`Processing contingent ${contingentId} with ${contingent.teams.length} teams`);
          
          // Generate contingent hashcode
          const contingentHashcode = `${contingentId}-${eventId}-${now.toISOString()}`;
          
          // Check if contingent attendance record exists
          const existingContingentAttendance = await prisma.$queryRaw`
            SELECT id FROM attendanceContingent 
            WHERE contingentId = ${contingentId} AND eventId = ${eventId}
            LIMIT 1
          ` as any[];
          
          console.log(`Contingent attendance check: contingentId=${contingentId}, eventId=${eventId}, exists=${existingContingentAttendance.length > 0}`);
          
          if (existingContingentAttendance && existingContingentAttendance.length > 0) {
            // Update existing record
            await prisma.$executeRaw`
              UPDATE attendanceContingent 
              SET attendanceDate = ${now}, 
                  attendanceTime = ${now}, 
                  updatedAt = ${now},
                  stateId = ${contingent.stateId || null},
                  zoneId = ${contingent.zoneId || null},
                  state = ${contingent.state || null}
              WHERE id = ${existingContingentAttendance[0].id}
            `;
            syncResults.updatedContingents++;
            console.log(`Updated attendance for contingent ${contingentId}`);
          } else {
            // Create new attendance record
            await prisma.$executeRaw`
              INSERT INTO attendanceContingent 
              (hashcode, contingentId, eventId, attendanceDate, attendanceTime, attendanceStatus, stateId, zoneId, state, createdAt, updatedAt)
              VALUES 
              (${contingentHashcode}, ${contingentId}, ${eventId}, ${now}, ${now}, 'Not Present', ${contingent.stateId || null}, ${contingent.zoneId || null}, ${contingent.state || null}, ${now}, ${now})
            `;
            syncResults.newContingents++;
            console.log(`Created new attendance record for contingent ${contingentId}`);
          }
          
          // Process teams for this contingent
          for (const team of contingent.teams) {
            const teamId = team.id;
            if (!teamId) {
              console.error(`Missing teamId for team in contingent ${contingentId}`);
              continue;
            }
            
            // Generate team hashcode
            const teamHashcode = `${teamId}-${eventId}-${now.toISOString()}`;
            
            // Check if team attendance record exists
            const existingTeamAttendance = await prisma.$queryRaw`
              SELECT id FROM attendanceTeam 
              WHERE teamId = ${teamId} AND eventId = ${eventId}
              LIMIT 1
            ` as any[];
            
            console.log(`Team attendance check: teamId=${teamId}, eventId=${eventId}, exists=${existingTeamAttendance.length > 0}`);
            
            if (existingTeamAttendance && existingTeamAttendance.length > 0) {
              // Update existing record
              await prisma.$executeRaw`
                UPDATE attendanceTeam 
                SET attendanceDate = ${now}, 
                    attendanceTime = ${now}, 
                    updatedAt = ${now},
                    stateId = ${contingent.stateId || null},
                    zoneId = ${contingent.zoneId || null},
                    state = ${contingent.state || null}
                WHERE id = ${existingTeamAttendance[0].id}
              `;
              syncResults.updatedTeams++;
              console.log(`Updated attendance for team ${teamId}, new hashcode: ${teamHashcode}`);
            } else {
              // Create new attendance record
              await prisma.$executeRaw`
                INSERT INTO attendanceTeam 
                (hashcode, contingentId, teamId, eventId, attendanceDate, attendanceTime, attendanceStatus, attendanceNote, stateId, zoneId, state, createdAt, updatedAt)
                VALUES 
                (${teamHashcode}, ${contingentId}, ${teamId}, ${eventId}, ${now}, ${now}, 'Not Present', NULL, ${contingent.stateId || null}, ${contingent.zoneId || null}, ${contingent.state || null}, ${now}, ${now})
              `;
              syncResults.newTeams++;
              console.log(`Created new attendance record for team ${teamId}, hashcode: ${teamHashcode}`);
            }
            
            // Process contestants for this team
            // IMPORTANT: After contingent grouping, members are stored in team.contestants, not team.members
            console.log(`PROCESSING TEAM: id=${teamId}, name=${team.name || 'unnamed'}, has members array: ${Array.isArray(team.members)}, members count: ${team.members ? team.members.length : 0}`);
            
            // CRITICAL DEBUGGING: Check for the existence of different array fields
            const hasMembers = Boolean(team.members && team.members.length > 0);
            const hasContestants = Boolean(team.contestants && team.contestants.length > 0);
            console.log(`ARRAY CHECK FOR TEAM ${teamId}: has members=${hasMembers} (${team.members?.length || 0}), has contestants=${hasContestants} (${team.contestants?.length || 0})`);
            
            // Log team data for debugging
            if (team.contestants && team.contestants.length > 0) {
              console.log('FIRST TEAM CONTESTANT STRUCTURE:', JSON.stringify(team.contestants[0]));
            } else if (team.members && team.members.length > 0) {
              console.log('FIRST TEAM MEMBER STRUCTURE:', JSON.stringify(team.members[0]));
            }
            
            // Debug the team object to see contest fields
            console.log(`TEAM CONTEST FIELDS: contestId=${team.contestId || 'undefined'}, contestCode=${team.contestCode || 'undefined'}, contestName=${team.contestName || 'undefined'}`);
            
            // FIXED: Use team.contestants (instead of team.members) because during contingent grouping
            // members arrays are transformed into contestants arrays
            if (!team.contestants || !Array.isArray(team.contestants) || team.contestants.length === 0) {
              console.log(`WARNING: Team ${teamId} has no contestants to process`);
              continue;
            }
            
            for (const contestant of team.contestants) {
              // Debug member object to see if it has contest fields
              console.log(`Member contest fields: contestId=${contestant.contestId || 'undefined'}, contestName=${contestant.contestName || 'undefined'}`);
              const contestantId = contestant.id;
              if (!contestantId) {
                console.error(`Missing contestantId for contestant in team ${teamId}`);
                continue;
              }
              
              // Generate contestant hashcode using SHA-256 from ic, eventId, and contingentId
              const contestantHashcode = createHashcode(contestant.ic || `${contestantId}`, eventId, contingentId, contestantId, 'contestant');
              
              // Check if contestant attendance record exists
              const existingContestantAttendance = await prisma.$queryRaw`
                SELECT id FROM attendanceContestant 
                WHERE contestantId = ${contestantId} AND teamId = ${teamId} AND eventId = ${eventId}
                LIMIT 1
              ` as any[];
              
              console.log(`Contestant attendance check: contestantId=${contestant.id}, teamId=${team.id}, eventId=${eventId}, exists=${existingContestantAttendance.length > 0}`);
              
              if (existingContestantAttendance && existingContestantAttendance.length > 0) {
                // Get contest fields directly from the team object with detailed logging
                const contestId = team.contestId || null;
                const contestName = team.contestName;
                const contestGroup = team.targetGroupLabel || null;

                //console.log('--------------------------TEAM---------------------------\n',team)
                
                console.log(`Team contest fields (update): Using contestId=${contestId}, contestName=${contestName}, contestGroup=${contestGroup}`);
                
                // Debug what we're actually using
                console.log(`Using for UPDATE: contestId=${contestId}, contestName=${contestName}, contestGroup=${contestGroup}`);
                
                // Update existing record
                await prisma.$executeRaw`
                  UPDATE attendanceContestant
                  SET attendanceDate = ${now},
                      attendanceTime = ${now},
                      updatedAt = ${now},
                      stateId = ${contingent.stateId || null},
                      zoneId = ${contingent.zoneId || null},
                      state = ${contingent.state || null},
                      contestId = ${contestId},
                      contestName = ${contestName},
                      contestGroup = ${contestGroup}
                  WHERE id = ${existingContestantAttendance[0].id}
                `;
                syncResults.updatedContestants++;
                console.log(`Updated attendance for contestant ${contestant.id}, new hashcode: ${contestantHashcode}`);
              } else {
                // Use contest fields from team (not contestant, since contestant doesn't have these fields)
                const contestId = team.contestId || null;
                const contestName = team.contestCode && team.contestName
                  ? `${team.contestCode} ${team.contestName}`.trim()
                  : null;
                const contestGroup = team.targetGroupLabel || null;
                
                console.log(`Team contest fields (insert): Using contestId=${contestId}, contestName=${contestName}, contestGroup=${contestGroup}`);
                
                // Debug what we're actually using
                console.log(`Using for INSERT: contestId=${contestId}, contestName=${contestName}, contestGroup=${contestGroup}, from contestant: ${!!contestant.contestId}`);
                
                // Create new attendance record for contestant
                await prisma.$executeRaw`
                  INSERT INTO attendanceContestant
                  (hashcode, contingentId, teamId, contestantId, participantId, eventId, ic, attendanceDate, attendanceTime, attendanceStatus, attendanceNote, stateId, zoneId, state, contestId, contestName, contestGroup, createdAt, updatedAt)
                  VALUES
                  (${contestantHashcode}, ${contingentId}, ${teamId}, ${contestantId}, ${contestant.id}, ${eventId}, ${contestant.ic || null}, ${now}, ${now}, 'Not Present', NULL, ${contingent.stateId || null}, ${contingent.zoneId || null}, ${contingent.state || null}, ${contestId}, ${contestName}, ${contestGroup}, ${now}, ${now})
                `;
                syncResults.newContestants++;
                console.log(`Created new attendance record for contestant ${contestant.id}, hashcode: ${contestantHashcode}`);
              }
            }
            
            // Process managers for this team
            for (const manager of team.managers) {
              const managerId = manager.id;
              const theContestGroup = manager.contestGroup;
              if (!managerId) {
                console.error(`Missing managerId for manager in team ${teamId}`);
                continue;
              }
              
              // Skip if already processed this manager for another team
              if (processedManagerIds.has(managerId)) {
                console.log(`Manager ${managerId} already processed, skipping...`);
                continue;
              }
              
              // Mark as processed
              processedManagerIds.add(managerId);
              
              // Generate manager hashcode using SHA-256 from ic, eventId, and contingentId
              const managerHashcode = createHashcode(manager.ic || `${managerId}`, eventId, contingentId, managerId, 'manager');
              
              // Check if manager attendance record exists (by managerId/eventId OR by hashcode)
              const existingManagerAttendance = await prisma.$queryRaw`
                SELECT id, hashcode FROM attendanceManager
                WHERE (managerId = ${managerId} AND eventId = ${eventId}) OR hashcode = ${managerHashcode}
                LIMIT 1
              ` as any[];
              
              console.log(`Manager attendance check: managerId=${manager.id}, eventId=${eventId}, exists=${existingManagerAttendance.length > 0}`);
              
              if (existingManagerAttendance && existingManagerAttendance.length > 0) {
                // Get contestGroup directly from SQL query field - ensure using raw value
                console.log('--------------------------UPDATE INSERT attendanceManager---------------------------\n',team)
                const contestGroup = team.contestGroup || null;
                console.log(`Manager UPDATE: Using contestGroup=${contestGroup} from schoolLevel`);
                
                // Update existing record
                await prisma.$executeRaw`
                  UPDATE attendanceManager
                  SET attendanceDate = ${now},
                      attendanceTime = ${now},
                      updatedAt = ${now},
                      stateId = ${contingent.stateId || null},
                      zoneId = ${contingent.zoneId || null},
                      state = ${contingent.state || null},
                      contestGroup = ${contestGroup},
                      email = ${manager.email || null},
                      email_status = ${'PENDING'}
                  WHERE id = ${existingManagerAttendance[0].id}
                `;
                syncResults.updatedManagers++;
                console.log(`Updated attendance for manager ${manager.id}, new hashcode: ${managerHashcode}`);
              } else {
                // Get contestGroup directly from SQL query field - ensure using raw value
                const contestGroup = team.targetGroupLabel || null;
                console.log(`Manager INSERT: Using contestGroup=${contestGroup} from targetGroupLabel`);
                
                try {
                  console.log(`TRYING TO INSERT MANAGER: managerId=${managerId}, contingentId=${contingentId}`);
                
                  // Create new attendance record for manager
                  await prisma.$executeRaw`
                    INSERT INTO attendanceManager
                    (hashcode, contingentId, managerId, eventId, attendanceDate, attendanceTime, attendanceStatus, attendanceNote, stateId, zoneId, state, contestGroup, email, email_status, createdAt, updatedAt)
                    VALUES
                    (${managerHashcode}, ${contingentId}, ${managerId}, ${eventId}, ${now}, ${now}, 'Not Present', NULL, ${contingent.stateId || null}, ${contingent.zoneId || null}, ${contingent.state || null}, ${contestGroup}, ${manager.email || null}, ${'PENDING'}, ${now}, ${now})
                  `;
                  
                  syncResults.newManagers++;
                  console.log(`SUCCESS: Created new attendance record for manager ${manager.id}, hashcode: ${managerHashcode}`);
                } catch (error: any) {
                  // Handle duplicate key error specifically
                  if (error.code === 'P2002' || (error.message && error.message.includes('Duplicate entry'))) {
                    console.log(`Manager ${managerId} hashcode already exists, treating as existing record`);
                    // Try to update the existing record instead
                    try {
                      await prisma.$executeRaw`
                        UPDATE attendanceManager
                        SET attendanceDate = ${now},
                            attendanceTime = ${now},
                            updatedAt = ${now},
                            stateId = ${contingent.stateId || null},
                            zoneId = ${contingent.zoneId || null},
                            state = ${contingent.state || null},
                            contestGroup = ${contestGroup},
                            email = ${manager.email || null},
                            email_status = ${'PENDING'}
                        WHERE hashcode = ${managerHashcode}
                      `;
                      syncResults.updatedManagers++;
                      console.log(`Updated existing manager record with hashcode: ${managerHashcode}`);
                    } catch (updateError) {
                      console.error(`Failed to update existing manager ${managerId}:`, updateError);
                      syncResults.errorCount = (syncResults.errorCount || 0) + 1;
                      syncResults.errors.push(`Manager ${managerId}: Failed to update existing record - ${updateError}`);
                    }
                  } else {
                    console.error(`FAILED to insert manager ${managerId}:`, error);
                    syncResults.errorCount = (syncResults.errorCount || 0) + 1;
                    syncResults.errors.push(`Manager ${managerId}: ${error.message || error}`);
                  }
                }
              }
            }
          }
        }
        
        console.log(`Sync completed with: ${syncResults.newContingents} new contingents, ${syncResults.newTeams} new teams, ${syncResults.newContestants} new contestants, ${syncResults.newManagers} new managers`);
        
      } catch (txError) {
        console.error('Transaction failed with error:', txError);
        syncResults.errors.push(`Transaction error: ${txError instanceof Error ? txError.message : 'Unknown error'}`);
      }
      
      // Return sync results
      return new NextResponse(JSON.stringify({
        success: true,
        message: 'Attendance sync completed successfully',
        syncResults
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      
    } catch (error: any) {
      console.error('Error syncing attendance:', error);
      return new NextResponse(JSON.stringify({
        error: `Failed to sync attendance data: ${error?.message || 'Unknown error'}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('Error syncing attendance:', error);
    return new NextResponse(JSON.stringify({
      error: `Failed to sync attendance data: ${error?.message || 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
