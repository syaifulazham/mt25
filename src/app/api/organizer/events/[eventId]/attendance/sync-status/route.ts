import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';

// Define types for endlist data
interface TeamMember {
  id: number;
  participantName: string;
  email: string | null;
  ic: string;
  edu_level: string;
  class_grade: string;
  age: number;
  formattedClassGrade: string;
  contingentName: string;
  contingentType: string;
}

interface TeamManager {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface TeamData {
  id: number;
  teamName: string;
  contestName: string;
  status: string;
  registrationDate: string;
  contingentId: number;
  contingentName: string;
  contingentType: string;
  schoolLevel: string;
  minAge: number;
  maxAge: number;
  targetGroupLabel: string;
  stateName: string;
  ppd: string;
  members: TeamMember[];
  managers?: TeamManager[] | string; // Can be a string JSON or array
}

type EndlistResponse = TeamData[];

interface SyncStatus {
  isSynced: boolean;
  lastSyncDate: string | null;
  actualCounts: {
    contingents: number;
    teams: number;
    contestants: number;
    managers: number;
  };
  expectedCounts: {
    contingents: number;
    teams: number;
    contestants: number;
    managers: number;
  };
  differences: {
    contingents: number;
    teams: number;
    contestants: number;
    managers: number;
  };
}

// Helper function to get the last sync date
async function getLastSyncDate(eventId: number, skipManagerCheck: boolean = false): Promise<string | null> {
  try {
    const promises = [

      prisma.$queryRaw`
        SELECT updatedAt FROM attendanceContingent 
        WHERE eventId = ${eventId} 
        ORDER BY updatedAt DESC LIMIT 1
      `,
      prisma.$queryRaw`
        SELECT updatedAt FROM attendanceTeam 
        WHERE eventId = ${eventId} 
        ORDER BY updatedAt DESC LIMIT 1
      `,
      prisma.$queryRaw`
        SELECT updatedAt FROM attendanceContestant 
        WHERE eventId = ${eventId} 
        ORDER BY updatedAt DESC LIMIT 1
      `
    ];
    
    // Only check manager table if not explicitly skipped (to handle case where table doesn't exist)
    if (!skipManagerCheck) {
      promises.push(prisma.$queryRaw`
        SELECT updatedAt FROM attendanceManager 
        WHERE eventId = ${eventId} 
        ORDER BY updatedAt DESC LIMIT 1
      `);
    }
    
    // Execute all queries and get results
    const results = await Promise.all(promises);
    
    // Collect all updatedAt values into a single array
    let allDates: Date[] = [];
    
    // Process results from each table query
    for (const result of results) {
      const tableResults = result as any[];
      if (tableResults.length > 0 && tableResults[0]?.updatedAt) {
        allDates.push(new Date(tableResults[0].updatedAt));
      }
    }

    if (allDates.length === 0) return null;

    const mostRecent = new Date(Math.max(...allDates.map((date: Date) => date.getTime())));
    return mostRecent.toISOString();
  } catch (error) {
    console.error('Error getting last sync date:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Function to fetch endlist data directly using the same queries as the endlist API
async function fetchEndlistData(eventId: number): Promise<EndlistResponse | null> {
  try {
    console.log(`Fetching endlist data for event ${eventId} using direct SQL queries...`);
    
    // Use the same SQL queries that the endlist endpoint and sync endpoint use
    // This avoids authentication issues with internal API calls
    try {
      // Fetch teams with APPROVED or ACCEPTED status from eventcontestteam for the specific event
      const teams = await prisma.$queryRaw`
        SELECT 
          t.id,
          t.name as teamName,
          c.id as contingentId,
          ct.name as contestName,
          ect.status,
          ect.createdAt as registrationDate,
          CASE 
            WHEN c.contingentType = 'SCHOOL' THEN s.name
            WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN hi.name
            WHEN c.contingentType = 'INDEPENDENT' THEN i.name
            ELSE 'Unknown'
          END as contingentName,
          c.contingentType as contingentType,
          tg.schoolLevel,
          tg.minAge,
          tg.maxAge,
          CASE 
            WHEN tg.schoolLevel = 'Primary' THEN 'Kids'
            WHEN tg.schoolLevel = 'Secondary' THEN 'Teens'
            WHEN tg.schoolLevel = 'Higher Education' THEN 'Youth'
            ELSE tg.schoolLevel
          END as targetGroupLabel,
          CASE 
            WHEN c.contingentType = 'SCHOOL' THEN st_s.name
            WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN st_hi.name
            WHEN c.contingentType = 'INDEPENDENT' THEN st_i.name
            ELSE 'Unknown State'
          END as stateName,
          CASE 
            WHEN c.contingentType = 'SCHOOL' THEN s.ppd
            WHEN c.contingentType = 'INDEPENDENT' THEN 'INDEPENDENT'
            ELSE 'Unknown PPD'
          END as ppd
        FROM eventcontestteam ect
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        JOIN team t ON ect.teamId = t.id
        JOIN contingent c ON t.contingentId = c.id
        JOIN contest ct ON ec.contestId = ct.id
        JOIN _contesttotargetgroup ctg ON ctg.A = ct.id
        JOIN targetgroup tg ON tg.id = ctg.B
        LEFT JOIN school s ON c.schoolId = s.id
        LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
        LEFT JOIN independent i ON c.independentId = i.id
        LEFT JOIN state st_s ON s.stateId = st_s.id
        LEFT JOIN state st_hi ON hi.stateId = st_hi.id
        LEFT JOIN state st_i ON i.stateId = st_i.id
        WHERE ec.eventId = ${eventId}
          AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
        ORDER BY tg.schoolLevel, st_s.name, st_hi.name, st_i.name, c.name, t.name ASC
      ` as any[];
      
      // Fetch team members for each team
      const teamsWithMembers = await Promise.all(
        teams.map(async (team) => {
          const members = await prisma.$queryRaw`
            SELECT 
              con.id,
              con.name as participantName,
              con.contingentId,
              con.email,
              con.ic,
              con.edu_level,
              con.class_grade,
              con.age,
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
            WHERE tm.teamId = ${team.id}
            ORDER BY con.name ASC
          ` as any[];

          // Fetch managers for this team using manager_team relationship
          let managers = [];
          try {
            managers = await prisma.$queryRaw`
              SELECT 
                m.id,
                m.name,
                m.email
              FROM manager_team mt
              JOIN manager m ON mt.managerId = m.id
              WHERE mt.teamId = ${team.id}
              ORDER BY m.name ASC
            ` as any[];
            
            console.log(`Fetched ${managers.length} managers for team ${team.id}: ${team.teamName}`);
          } catch (managerErr) {
            console.error(`Error fetching managers for team ${team.id}:`, managerErr);
            managers = [];
          }
          
          return {
            ...team,
            members: members || [],
            managers: managers || []
          };
        })
      );

      // Filter out teams where any member's age doesn't match target group age range
      // unless the team status is 'APPROVED_SPECIAL'
      const filteredTeams = teamsWithMembers.filter((team) => {
        // If team status is APPROVED_SPECIAL, always include the team
        if (team.status === 'APPROVED_SPECIAL') {
          return true;
        }

        // Check if all members' ages are within the target group age range
        const allMembersAgeValid = team.members.every((member: any) => {
          const memberAge = parseInt(member.age);
          const minAge = parseInt(team.minAge);
          const maxAge = parseInt(team.maxAge);
          
          // If age data is missing or invalid, exclude the team for safety
          if (isNaN(memberAge) || isNaN(minAge) || isNaN(maxAge)) {
            return false;
          }
          
          // Check if member age is within the target group range
          return memberAge >= minAge && memberAge <= maxAge;
        });

        return allMembersAgeValid;
      });

      console.log(`Endlist data fetched successfully: ${filteredTeams.length} teams`);
      return filteredTeams as EndlistResponse;
    } catch (sqlError) {
      console.error('Error executing SQL queries for endlist data:', sqlError);
      return null;
    }
  } catch (error) {
    console.error('Error fetching endlist data:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    console.log('Sync-status API called with eventId:', params.eventId);
    
    // Auth check using next-auth session
    const session = await getServerSession(authOptions);
    console.log('Auth session:', session ? 'Valid' : 'Invalid', 
              'Role:', (session?.user as any)?.role);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is an organizer admin, operator, or viewer
    if (
      (session.user as any).role !== "ADMIN" &&
      (session.user as any).role !== "OPERATOR" &&
      (session.user as any).role !== "VIEWER"
    ) {
      console.log('Auth failed: Insufficient permissions');
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Parse and validate event ID
    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      console.log('Invalid event ID format');
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }
    
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      console.log('Event not found with ID:', eventId);
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Fetch endlist data directly using SQL queries (same as sync endpoint)
    const endlistData = await fetchEndlistData(eventId);
    
    if (!endlistData) {
      return new NextResponse(JSON.stringify({
        error: 'Failed to fetch endlist data'
      }), { status: 500 });
    }

    // Calculate expected team counts
    const expectedTeamCount = endlistData.length;
    const expectedContestantCount = endlistData.reduce(
      (acc: number, team: TeamData) => acc + (team.members?.length || 0), 
      0
    );
    
    // Calculate expected contingent count (distinct contingentIds)
    const uniqueContingentIds = new Set(endlistData.map(team => team.contingentId));
    const expectedContingentCount = uniqueContingentIds.size;
    
    // Calculate expected manager count using distinct manager IDs
    const allManagers = new Set();
    endlistData.forEach((team: TeamData) => {
      // Parse managers if they exist in JSON string format
      let managers = [];
      if (team.managers) {
        try {
          managers = typeof team.managers === 'string' ? 
            JSON.parse(team.managers) : 
            (Array.isArray(team.managers) ? team.managers : []);
            
          // Add each manager's ID to the Set for deduplication
          managers.forEach((manager: any) => {
            if (manager && manager.id) {
              allManagers.add(manager.id);
            }
          });
        } catch (e) {
          console.error('Error parsing managers data:', e);
        }
      }
    });
    const expectedManagerCount = allManagers.size; // Count of unique manager IDs
    
    // Get actual attendance records count
    let actualTeamCount = 0;
    let actualContestantCount = 0;
    let actualManagerCount = 0;
    let actualContingentCount = 0;
    
    try {
      // Query all actual counts
      const [contingentResults, teamResults, contestantResults, managerResults] = await Promise.all([
        prisma.$queryRaw`
          SELECT COUNT(*) as count FROM attendanceContingent 
          WHERE eventId = ${eventId}
        ` as Promise<[{ count: number }]>,
        prisma.$queryRaw`
          SELECT COUNT(*) as count FROM attendanceTeam 
          WHERE eventId = ${eventId}
        ` as Promise<[{ count: number }]>,
        prisma.$queryRaw`
          SELECT COUNT(*) as count FROM attendanceContestant 
          WHERE eventId = ${eventId}
        ` as Promise<[{ count: number }]>,
        prisma.$queryRaw`
          SELECT COUNT(*) as count FROM attendanceManager 
          WHERE eventId = ${eventId}
        ` as Promise<[{ count: number }]>
      ]);
      
      // Extract counts from query results
      actualContingentCount = Number(contingentResults[0]?.count || 0);
      actualTeamCount = Number(teamResults[0]?.count || 0);
      actualContestantCount = Number(contestantResults[0]?.count || 0);
      actualManagerCount = Number(managerResults[0]?.count || 0);
      
      // Determine if attendance is in sync (include contingent count)
      const isSynced = 
        expectedContingentCount === actualContingentCount &&
        expectedTeamCount === actualTeamCount && 
        expectedContestantCount === actualContestantCount &&
        expectedManagerCount === actualManagerCount;

      // Calculate the differences (include contingent difference)
      const differences = {
        contingents: expectedContingentCount - actualContingentCount,
        teams: expectedTeamCount - actualTeamCount,
        contestants: expectedContestantCount - actualContestantCount,
        managers: expectedManagerCount - actualManagerCount
      };

      // Get last sync date
      const lastSyncDate = await getLastSyncDate(eventId);
      
      // Prepare response
      const response: SyncStatus = {
        isSynced,
        lastSyncDate,
        actualCounts: {
          contingents: actualContingentCount,
          teams: actualTeamCount,
          contestants: actualContestantCount,
          managers: actualManagerCount
        },
        expectedCounts: {
          contingents: expectedContingentCount,
          teams: expectedTeamCount,
          contestants: expectedContestantCount,
          managers: expectedManagerCount
        },
        differences
      };
      
      return NextResponse.json(response);
    } catch (dbError) {
      // If there's a database error (likely due to missing table), return a sync status without manager counts
      console.log('Database query error, likely missing table:', dbError);
      
      // Fall back to calculating without manager data
      // Fall back to calculating without manager data
      const [actualContingents, actualTeams, actualContestants] = await Promise.all([
        prisma.$queryRaw`
          SELECT COUNT(*) as count FROM attendanceContingent 
          WHERE eventId = ${eventId}
        ` as Promise<[{ count: number }]>,
        prisma.$queryRaw`
          SELECT COUNT(*) as count FROM attendanceTeam 
          WHERE eventId = ${eventId}
        ` as Promise<[{ count: number }]>,
        prisma.$queryRaw`
          SELECT COUNT(*) as count FROM attendanceContestant 
          WHERE eventId = ${eventId}
        ` as Promise<[{ count: number }]>
      ]);
      
      // In the fallback path, we're getting just one contingent count
      // Set both to the same count initially, then attempt to get team count separately
      const actualContingentCount = Number(actualTeams[0]?.count || 0);
      let actualTeamCount = 0;
      
      // Try to get actual team count separately
      try {
        const actualTeamQuery = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM attendanceTeam 
          WHERE eventId = ${eventId}
        ` as [{ count: number }];
        actualTeamCount = Number(actualTeamQuery[0]?.count || 0);
      } catch (teamErr) {
        console.log('Team table query failed separately:', teamErr);
      }
      const actualContestantCount = Number(actualContestants[0]?.count || 0);
      
      // For managers, try to query the attendanceManager table separately
      // This way, if only this table had an error in the Promise.all, we can still get its data
      let actualManagerCount = 0;
      try {
        const actualManagersQuery = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM attendanceManager 
          WHERE eventId = ${eventId}
        ` as [{ count: number }];
        actualManagerCount = Number(actualManagersQuery[0]?.count || 0);
        console.log('Separately queried manager count:', actualManagerCount);
      } catch (managerErr) {
        // If this query also fails, then the table truly doesn't exist
        console.log('Manager table query failed separately:', managerErr);
      }
      
      // Determine if attendance is in sync (include contingents and managers)
      const isSynced = 
        expectedContingentCount === actualContingentCount &&
        expectedTeamCount === actualTeamCount && 
        expectedContestantCount === actualContestantCount &&
        expectedManagerCount === actualManagerCount;
      
      // Calculate differences (include contingents)
      const differences = {
        contingents: expectedContingentCount - actualContingentCount,
        teams: expectedTeamCount - actualTeamCount,
        contestants: expectedContestantCount - actualContestantCount,
        managers: expectedManagerCount - actualManagerCount
      };
      
      // Get last sync date without checking manager table
      const lastSyncDate = await getLastSyncDate(eventId, true);
      
      // Prepare complete response including contingent data
      const response: SyncStatus = {
        isSynced,
        lastSyncDate,
        actualCounts: {
          contingents: actualContingentCount,
          teams: actualTeamCount,
          contestants: actualContestantCount,
          managers: actualManagerCount
        },
        expectedCounts: {
          contingents: expectedContingentCount,
          teams: expectedTeamCount,
          contestants: expectedContestantCount,
          managers: expectedManagerCount
        },
        differences
      };
      
      return NextResponse.json(response);
    }
  } catch (error) {
    // Enhanced error logging with stack trace if available
    console.error('Error processing attendance data:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    let errorMessage = 'Error processing attendance data';
    let errorDetails = error instanceof Error ? error.message : String(error);
    
    // Special handling for specific error types
    if (errorDetails.includes('manager_team')) {
      errorMessage = 'Error querying manager_team table';
    } else if (errorDetails.includes('attendanceManager')) {
      errorMessage = 'Error querying attendanceManager table';
    }
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}
