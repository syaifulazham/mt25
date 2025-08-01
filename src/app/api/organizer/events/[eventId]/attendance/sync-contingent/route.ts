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

    // Get contingentId from request body
    const body = await request.json();
    const { contingentId } = body;

    if (!contingentId) {
      return new NextResponse(JSON.stringify({
        error: 'Missing contingentId parameter'
      }), {
        status: 400,
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
    if (!eventId || isNaN(eventId)) {
      return new NextResponse(JSON.stringify({
        error: 'Invalid or missing eventId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      return new NextResponse(JSON.stringify({
        error: `Event with ID ${eventId} not found`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure contingent exists
    const contingent = await prisma.contingent.findUnique({
      where: { id: contingentId }
    });
    
    if (!contingent) {
      return new NextResponse(JSON.stringify({
        error: `Contingent with ID ${contingentId} not found`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting attendance sync for event ${eventId}, contingent ${contingentId}`);

    try {
      // Query teams for the specific contingent with related data for the given event
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
            WHEN c.contingentType = 'SCHOOL' THEN s.ppd
            WHEN c.contingentType = 'INDEPENDENT' THEN 'INDEPENDENT'
            ELSE 'Unknown PPD'
          END) as ppd,
          MAX(CASE 
            WHEN c.contingentType = 'SCHOOL' THEN st_s.id
            WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN st_hi.id
            WHEN c.contingentType = 'INDEPENDENT' THEN st_i.id
            ELSE NULL
          END) as stateId,
          MAX(CASE 
            WHEN c.contingentType = 'SCHOOL' THEN st_s.zoneId
            WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN st_hi.zoneId
            WHEN c.contingentType = 'INDEPENDENT' THEN st_i.zoneId
            ELSE NULL
          END) as zoneId
        FROM eventcontestteam ect
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        JOIN team t ON ect.teamId = t.id
        JOIN contingent c ON t.contingentId = c.id
        JOIN contest team_contest ON t.contestId = team_contest.id
        JOIN contest ct ON ec.contestId = ct.id
        JOIN _contesttotargetgroup ctg ON ctg.A = ct.id
        JOIN targetgroup tg ON tg.id = ctg.B
        LEFT JOIN school s ON c.schoolId = s.id
        LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
        LEFT JOIN independent i ON c.independentId = i.id
        LEFT JOIN state st_s ON s.stateId = st_s.id
        LEFT JOIN state st_hi ON hi.stateId = st_hi.id
        LEFT JOIN state st_i ON i.stateId = st_i.id
        WHERE ec.eventId = ? 
          AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
          AND c.id = ?
        GROUP BY t.id, t.name, t.contestId, c.id, team_contest.id, team_contest.code, team_contest.name
        ORDER BY MAX(tg.schoolLevel), MAX(COALESCE(st_s.name, st_hi.name, st_i.name)), MAX(c.name), t.name ASC
      `;

      const teams = await prisma.$queryRawUnsafe(teamsQuery, eventId, contingentId) as any[];
      console.log(`Found ${teams.length} teams for contingent ${contingentId}`);

      if (teams.length === 0) {
        return new NextResponse(JSON.stringify({
          success: true,
          message: 'No teams found for this contingent in the event',
          syncResults
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Process teams for the specific contingent
      for (const team of teams) {
        syncResults.totalTeams++;
        
        // Get team members
        const membersQuery = `
          SELECT 
            con.id,
            con.name as participantName,
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
          WHERE tm.teamId = ?
          ORDER BY con.name ASC
        `;

        const members = await prisma.$queryRawUnsafe(membersQuery, team.id) as any[];

        // Filter teams based on age validation (same logic as endlist)
        if (team.status !== 'APPROVED_SPECIAL') {
          const allMembersAgeValid = members.every((member: any) => {
            const memberAge = parseInt(member.age);
            const minAge = parseInt(team.minAge);
            const maxAge = parseInt(team.maxAge);
            
            if (isNaN(memberAge) || isNaN(minAge) || isNaN(maxAge)) {
              return false;
            }
            
            return memberAge >= minAge && memberAge <= maxAge;
          });

          if (!allMembersAgeValid) {
            console.log(`Skipping team ${team.id} due to age validation failure`);
            continue;
          }
        }

        // Process contingent
        const contingentData = {
          id: team.contingentId,
          name: team.contingentName,
          type: team.contingentType,
          state: team.stateName,
          stateId: team.stateId,
          zoneId: team.zoneId
        };

        // Check if contingent already exists in attendance
        const existingContingent = await prisma.$queryRaw`
          SELECT id FROM attendanceContingent WHERE contingentId = ${contingentData.id} AND eventId = ${eventId}
        ` as any[];

        if (existingContingent.length === 0) {
          // Create contingent hashcode
          const contingentHashcode = createHashcode(contingentData.id.toString(), eventId, contingentData.id);
          
          await prisma.$executeRaw`
            INSERT INTO attendanceContingent
            (hashcode, contingentId, eventId, attendanceDate, attendanceTime, attendanceStatus, stateId, zoneId, state, createdAt, updatedAt)
            VALUES
            (${contingentHashcode}, ${contingentData.id}, ${eventId}, ${now}, ${now}, 'Not Present', ${contingentData.stateId}, ${contingentData.zoneId}, ${contingentData.state}, ${now}, ${now})
          `;
          syncResults.newContingents++;
          syncResults.totalContingents++;
        } else {
          syncResults.totalContingents++;
        }

        // Process team
        const existingTeam = await prisma.$queryRaw`
          SELECT id FROM attendanceTeam WHERE teamId = ${team.id} AND eventId = ${eventId}
        ` as any[];

        if (existingTeam.length === 0) {
          await prisma.$executeRaw`
            INSERT INTO attendanceTeam
            (hashcode, contingentId, teamId, eventId, attendanceDate, attendanceTime, attendanceStatus, attendanceNote, stateId, zoneId, state, createdAt, updatedAt)
            VALUES
            (${createHashcode(team.id.toString(), eventId, team.contingentId)}, ${team.contingentId}, ${team.id}, ${eventId}, ${now}, ${now}, 'Not Present', NULL, ${team.stateId}, ${team.zoneId}, ${team.stateName}, ${now}, ${now})
          `;
          syncResults.newTeams++;
        } else {
          // Update existing team
          await prisma.$executeRaw`
            UPDATE attendanceTeam
            SET attendanceDate = ${now},
                attendanceTime = ${now},
                updatedAt = ${now},
                stateId = ${team.stateId},
                zoneId = ${team.zoneId},
                state = ${team.stateName}
            WHERE teamId = ${team.id} AND eventId = ${eventId}
          `;
          syncResults.updatedTeams++;
        }

        // Process contestants
        for (const member of members) {
          syncResults.totalContestants++;
          const contestantHashcode = createHashcode(member.ic, eventId, team.contingentId);

          const existingContestant = await prisma.$queryRaw`
            SELECT id FROM attendanceContestant WHERE contestantId = ${member.id} AND eventId = ${eventId}
          ` as any[];

          if (existingContestant.length === 0) {
            await prisma.$executeRaw`
              INSERT INTO attendanceContestant
              (hashcode, contingentId, teamId, contestantId, participantId, eventId, ic, attendanceDate, attendanceTime, attendanceStatus, attendanceNote, stateId, zoneId, state, contestId, contestName, contestGroup, createdAt, updatedAt)
              VALUES
              (${contestantHashcode}, ${team.contingentId}, ${team.id}, ${member.id}, ${member.id}, ${eventId}, ${member.ic || null}, ${now}, ${now}, 'Not Present', NULL, ${team.stateId}, ${team.zoneId}, ${team.stateName}, ${team.contestId}, ${team.contestName}, ${team.schoolLevel}, ${now}, ${now})
            `;
            syncResults.newContestants++;
          } else {
            await prisma.$executeRaw`
              UPDATE attendanceContestant
              SET attendanceDate = ${now},
                  attendanceTime = ${now},
                  updatedAt = ${now},
                  stateId = ${team.stateId},
                  zoneId = ${team.zoneId},
                  state = ${team.stateName},
                  contestGroup = ${team.schoolLevel},
                  ic = ${member.ic || null},
                  contestId = ${team.contestId},
                  contestName = ${team.contestName}
              WHERE contestantId = ${member.id} AND eventId = ${eventId}
            `;
            syncResults.updatedContestants++;
          }
        }

        // Process managers for this team (using manager_team junction table like original sync)
        const managersQuery = `
          SELECT 
            m.id,
            m.name as managerName,
            m.email,
            m.ic,
            m.phoneNumber
          FROM manager_team mt
          JOIN manager m ON m.id = mt.managerId
          WHERE mt.teamId = ?
        `;

        const managers = await prisma.$queryRawUnsafe(managersQuery, team.id) as any[];

        for (const manager of managers) {
          syncResults.totalManagers++;
          const managerHashcode = createHashcode(manager.ic, eventId, team.contingentId);

          const existingManagerAttendance = await prisma.$queryRaw`
            SELECT id FROM attendanceManager WHERE managerId = ${manager.id} AND eventId = ${eventId}
          ` as any[];

          if (existingManagerAttendance.length === 0) {
            await prisma.$executeRaw`
              INSERT INTO attendanceManager
              (hashcode, contingentId, managerId, eventId, attendanceDate, attendanceTime, attendanceStatus, attendanceNote, stateId, zoneId, state, contestGroup, email, email_status, createdAt, updatedAt)
              VALUES
              (${managerHashcode}, ${team.contingentId}, ${manager.id}, ${eventId}, ${now}, ${now}, 'Not Present', NULL, ${team.stateId}, ${team.zoneId}, ${team.stateName}, ${team.schoolLevel}, ${manager.email || null}, ${'PENDING'}, ${now}, ${now})
            `;
            syncResults.newManagers++;
          } else {
            await prisma.$executeRaw`
              UPDATE attendanceManager
              SET attendanceDate = ${now},
                  attendanceTime = ${now},
                  updatedAt = ${now},
                  stateId = ${team.stateId},
                  zoneId = ${team.zoneId},
                  state = ${team.stateName},
                  contestGroup = ${team.schoolLevel},
                  email = ${manager.email || null},
                  email_status = ${'PENDING'}
              WHERE managerId = ${manager.id} AND eventId = ${eventId}
            `;
            syncResults.updatedManagers++;
          }
        }
      }

      // Create or update attendanceContingent record to mark this contingent as synced
      const existingContingentAttendance = await prisma.$queryRaw`
        SELECT id FROM attendanceContingent 
        WHERE contingentId = ${contingentId} AND eventId = ${eventId}
        LIMIT 1
      ` as any[];

      if (existingContingentAttendance.length === 0) {
        // Create new attendanceContingent record
        await prisma.$executeRaw`
          INSERT INTO attendanceContingent
          (contingentId, eventId, attendanceDate, attendanceTime, attendanceStatus, createdAt, updatedAt)
          VALUES
          (${contingentId}, ${eventId}, ${now}, ${now}, 'Synced', ${now}, ${now})
        `;
        syncResults.newContingents++;
        console.log(`Created attendanceContingent record for contingent ${contingentId}`);
      } else {
        // Update existing attendanceContingent record
        await prisma.$executeRaw`
          UPDATE attendanceContingent
          SET attendanceDate = ${now},
              attendanceTime = ${now},
              attendanceStatus = 'Synced',
              updatedAt = ${now}
          WHERE contingentId = ${contingentId} AND eventId = ${eventId}
        `;
        syncResults.updatedContingents++;
        console.log(`Updated attendanceContingent record for contingent ${contingentId}`);
      }

      console.log(`Contingent sync completed: ${syncResults.newContingents} new contingents, ${syncResults.newTeams} new teams, ${syncResults.newContestants} new contestants, ${syncResults.newManagers} new managers`);

      return new NextResponse(JSON.stringify({
        success: true,
        message: `Attendance sync completed successfully for contingent ${contingent.name}`,
        syncResults
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error: any) {
      console.error('Error syncing contingent attendance:', error);
      syncResults.errors.push(`Sync error: ${error?.message || 'Unknown error'}`);
      return new NextResponse(JSON.stringify({
        error: `Failed to sync contingent attendance data: ${error?.message || 'Unknown error'}`,
        syncResults
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('Error syncing contingent attendance:', error);
    return new NextResponse(JSON.stringify({
      error: `Failed to sync contingent attendance data: ${error?.message || 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
