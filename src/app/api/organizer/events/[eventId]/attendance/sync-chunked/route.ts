import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Function to create SHA-256 hash from IC, eventId, and contingentId
function createHashcode(ic: string, eventId: number, contingentId: number): string {
  const input = `${ic}-${eventId}-${contingentId}`;
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

    const body = await request.json();
    const { action, chunkSize = 50, offset = 0 } = body;

    if (action === 'count') {
      // Get total count of teams to process
      const countQuery = `
        SELECT COUNT(DISTINCT t.id) as totalTeams
        FROM eventcontestteam ect
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        JOIN team t ON ect.teamId = t.id
        WHERE ec.eventId = ? AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
      `;
      
      const countResult = await prisma.$queryRawUnsafe(countQuery, eventId) as any[];
      const totalTeams = countResult[0]?.totalTeams || 0;

      return NextResponse.json({
        success: true,
        totalTeams,
        chunkSize,
        totalChunks: Math.ceil(totalTeams / chunkSize)
      });
    }

    if (action === 'chunk') {
      // Process a chunk of teams
      console.log(`Processing chunk: offset=${offset}, chunkSize=${chunkSize}, eventId=${eventId}`);

      // Sync Results to track operation statistics for this chunk
      interface ChunkSyncResults {
        processedTeams: number;
        newContingents: number;
        updatedContingents: number;
        newTeams: number;
        updatedTeams: number;
        newContestants: number;
        updatedContestants: number;
        newManagers: number;
        updatedManagers: number;
        errorCount: number;
        errors: string[];
      }

      const syncResults: ChunkSyncResults = {
        processedTeams: 0,
        newContingents: 0,
        updatedContingents: 0,
        newTeams: 0,
        updatedTeams: 0,
        newContestants: 0,
        updatedContestants: 0,
        newManagers: 0,
        updatedManagers: 0,
        errorCount: 0,
        errors: []
      };

      try {
        // Get teams for this chunk with LIMIT and OFFSET
        const teamsQuery = `
          SELECT 
            t.id,
            t.name as teamName,
            t.contestId as originalContestId,
            c.id as contingentId,
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
          JOIN contest team_contest ON t.contestId = team_contest.id
          LEFT JOIN manager_team mt ON mt.teamId = t.id
          LEFT JOIN manager m ON m.id = mt.managerId
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
          LEFT JOIN zone z_s ON st_s.zoneId = z_s.id
          LEFT JOIN zone z_hi ON st_hi.zoneId = z_hi.id
          LEFT JOIN zone z_i ON st_i.zoneId = z_i.id
          WHERE ec.eventId = ? AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
          GROUP BY t.id, mt.teamId, m.id, team_contest.id, team_contest.code, team_contest.name
          LIMIT ? OFFSET ?
        `;

        const teams = await prisma.$queryRawUnsafe(teamsQuery, eventId, chunkSize, offset) as any[];
        console.log(`Retrieved ${teams.length} teams for chunk processing`);

        if (teams.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'No teams to process in this chunk',
            syncResults
          });
        }

        // Get team members for each team in this chunk
        const teamsWithMembers = await Promise.all(
          teams.map(async (team) => {
            const contestId = team.contestId;
            const contestCode = team.contestCode;
            const contestName = team.contestName;
            
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

        // Filter teams with members and validate age range
        const filteredTeams = teamsWithMembers.filter(team => {
          const minAge = team.minAge || 0;
          const maxAge = team.maxAge || 100;
          
          if (!team.members || !Array.isArray(team.members) || team.members.length === 0) {
            console.log(`Skipping team ${team.id} - no members`);
            return false;
          }
          
          const allMembersInRange = team.members.every((member: any) => {
            const age = member.age || 0;
            return age >= minAge && age <= maxAge;
          });
          
          return allMembersInRange;
        });

        // Process teams data
        const teamsData = filteredTeams.map(team => ({
          id: team.id,
          teamName: team.teamName,
          originalContestId: team.originalContestId,
          contestId: team.contestId,
          contestCode: team.contestCode,
          contestName: team.contestName,
          contingentId: team.contingentId,
          contingentName: team.contingentName,
          contingentType: team.contingentType,
          schoolLevel: team.schoolLevel,
          targetGroupLabel: team.targetGroupLabel,
          stateName: team.stateName,
          stateId: team.stateId,
          zoneId: team.zoneId,
          ppd: team.ppd,
          members: team.members || [],
          managers: typeof team.managers === 'string' ? JSON.parse(team.managers) : team.managers,
        }));

        // Group teams by contingent
        const contingentMap = new Map();
        teamsData.forEach((team: any) => {
          if (!team.id || !team.contingentName) return;
          
          const contingentId = team.contingentId;
          if (!contingentId) {
            console.error(`Missing contingentId for team ${team.id}`);
            return;
          }
          
          let contingentEntry = contingentMap.get(contingentId);
          if (!contingentEntry) {
            contingentEntry = {
              id: contingentId,
              name: team.contingentName,
              type: team.contingentType,
              stateId: team.stateId,
              state: team.stateName,
              zoneId: team.zoneId,
              teams: []
            };
            contingentMap.set(contingentId, contingentEntry);
          }
          
          const managers = team.managers ? 
            (Array.isArray(team.managers) ? team.managers : JSON.parse(team.managers)) : [];
            
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
            members: team.members || [],
            managers: managers
          });
        });

        // Process each contingent
        const processedManagerIds = new Set();
        
        for (const [contingentId, contingent] of contingentMap) {
          console.log(`Processing contingent ${contingentId}: ${contingent.name}`);
          
          // Check/create contingent attendance record
          const existingContingentAttendance = await prisma.$queryRaw`
            SELECT id FROM attendanceContingent
            WHERE contingentId = ${contingentId} AND eventId = ${eventId}
            LIMIT 1
          ` as any[];

          if (existingContingentAttendance.length === 0) {
            const contingentHashcode = createHashcode(`contingent-${contingentId}`, eventId, contingentId);
            
            await prisma.$executeRaw`
              INSERT INTO attendanceContingent
              (hashcode, contingentId, eventId, attendanceDate, attendanceTime, attendanceStatus, stateId, zoneId, state, createdAt, updatedAt)
              VALUES
              (${contingentHashcode}, ${contingentId}, ${eventId}, ${now}, ${now}, 'Not Present', ${contingent.stateId || null}, ${contingent.zoneId || null}, ${contingent.state || null}, ${now}, ${now})
            `;
            syncResults.newContingents++;
          } else {
            syncResults.updatedContingents++;
          }

          // Process teams in this contingent
          for (const team of contingent.teams) {
            const teamId = team.id;
            console.log(`Processing team ${teamId}: ${team.name}`);
            
            // Check/create team attendance record
            const existingTeamAttendance = await prisma.$queryRaw`
              SELECT id FROM attendanceTeam
              WHERE teamId = ${teamId} AND eventId = ${eventId}
              LIMIT 1
            ` as any[];

            if (existingTeamAttendance.length === 0) {
              const teamHashcode = createHashcode(`team-${teamId}`, eventId, contingentId);
              
              await prisma.$executeRaw`
                INSERT INTO attendanceTeam
                (hashcode, contingentId, teamId, eventId, attendanceDate, attendanceTime, attendanceStatus, stateId, zoneId, state, createdAt, updatedAt)
                VALUES
                (${teamHashcode}, ${contingentId}, ${teamId}, ${eventId}, ${now}, ${now}, 'Not Present', ${contingent.stateId || null}, ${contingent.zoneId || null}, ${contingent.state || null}, ${now}, ${now})
              `;
              syncResults.newTeams++;
            } else {
              syncResults.updatedTeams++;
            }

            // Process contestants/members
            for (const member of team.members) {
              const contestantId = member.id;
              const contestantHashcode = createHashcode(member.ic || `${contestantId}`, eventId, contingentId);
              
              const existingContestantAttendance = await prisma.$queryRaw`
                SELECT id FROM attendanceContestant
                WHERE contestantId = ${contestantId} AND eventId = ${eventId}
                LIMIT 1
              ` as any[];

              if (existingContestantAttendance.length === 0) {
                await prisma.$executeRaw`
                  INSERT INTO attendanceContestant
                  (hashcode, participantId, contingentId, eventId, teamId, contestantId, attendanceDate, attendanceTime, attendanceStatus, ic, stateId, zoneId, state, contestGroup, contestId, contestName, createdAt, updatedAt)
                  VALUES
                  (${contestantHashcode}, ${contestantId}, ${contingentId}, ${eventId}, ${teamId}, ${contestantId}, ${now}, ${now}, 'Not Present', ${member.ic || null}, ${contingent.stateId || null}, ${contingent.zoneId || null}, ${contingent.state || null}, ${team.contestGroup || null}, ${team.contestId || null}, ${team.contestName || null}, ${now}, ${now})
                `;
                syncResults.newContestants++;
              } else {
                syncResults.updatedContestants++;
              }
            }

            // Process managers for this team
            for (const manager of team.managers) {
              const managerId = manager.id;
              if (!managerId || processedManagerIds.has(managerId)) {
                continue;
              }
              
              processedManagerIds.add(managerId);
              const managerHashcode = createHashcode(manager.ic || `${managerId}`, eventId, contingentId);
              
              const existingManagerAttendance = await prisma.$queryRaw`
                SELECT id FROM attendanceManager
                WHERE managerId = ${managerId} AND eventId = ${eventId}
                LIMIT 1
              ` as any[];

              if (existingManagerAttendance.length === 0) {
                const contestGroup = team.schoolLevel || null;
                
                try {
                  await prisma.$executeRaw`
                    INSERT INTO attendanceManager
                    (hashcode, contingentId, managerId, eventId, attendanceDate, attendanceTime, attendanceStatus, attendanceNote, stateId, zoneId, state, contestGroup, email, email_status, createdAt, updatedAt)
                    VALUES
                    (${managerHashcode}, ${contingentId}, ${managerId}, ${eventId}, ${now}, ${now}, 'Not Present', NULL, ${contingent.stateId || null}, ${contingent.zoneId || null}, ${contingent.state || null}, ${contestGroup}, ${manager.email || null}, ${'PENDING'}, ${now}, ${now})
                  `;
                  syncResults.newManagers++;
                } catch (error) {
                  console.error(`Failed to insert manager ${managerId}:`, error);
                  syncResults.errorCount++;
                  syncResults.errors.push(`Manager ${managerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              } else {
                syncResults.updatedManagers++;
              }
            }
            
            syncResults.processedTeams++;
          }
        }

        console.log(`Chunk completed: processed ${syncResults.processedTeams} teams`);
        
        return NextResponse.json({
          success: true,
          message: `Chunk processed: ${syncResults.processedTeams} teams`,
          syncResults
        });

      } catch (error: any) {
        console.error('Error processing chunk:', error);
        syncResults.errorCount++;
        syncResults.errors.push(`Chunk processing error: ${error.message || 'Unknown error'}`);
        
        return NextResponse.json({
          success: false,
          error: `Failed to process chunk: ${error.message || 'Unknown error'}`,
          syncResults
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "count" or "chunk".'
    }, { status: 400 });

  } catch (error: any) {
    console.error('Error in chunked sync:', error);
    return NextResponse.json({
      error: `Failed to sync attendance data: ${error?.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
