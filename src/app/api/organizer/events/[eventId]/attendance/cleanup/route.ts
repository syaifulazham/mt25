import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    // Verify user is authorized for this operation
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.role || !['ADMIN', 'OPERATOR', 'admin', 'operator'].includes(session.user.role)) {
      return NextResponse.json({
        error: 'Unauthorized. Only admins and operators can cleanup attendance.'
      }, { status: 401 });
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    // Ensure event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      return NextResponse.json({
        error: `Event with ID ${eventId} not found`
      }, { status: 404 });
    }

    console.log(`Starting attendance cleanup for event ${eventId}`);

    // Step 1: Get current endlist team IDs (teams with APPROVED/ACCEPTED/APPROVED_SPECIAL status)
    const endlistTeamIds = await prisma.$queryRaw`
      SELECT DISTINCT t.id as teamId
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      WHERE ec.eventId = ${eventId}
        AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
    ` as any[];

    const validTeamIds = endlistTeamIds.map(row => Number(row.teamId));
    console.log(`Found ${validTeamIds.length} valid teams in endlist`);

    // Step 2: Get current endlist contestant IDs (contestants from valid teams with age validation)
    const endlistContestantIds = await prisma.$queryRaw`
      SELECT DISTINCT con.id as contestantId
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      JOIN teamMember tm ON tm.teamId = t.id
      JOIN contestant con ON tm.contestantId = con.id
      JOIN contest ct ON ec.contestId = ct.id
      JOIN _contesttotargetgroup ctg ON ctg.A = ct.id
      JOIN targetgroup tg ON tg.id = ctg.B
      WHERE ec.eventId = ${eventId}
        AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
        AND con.age >= COALESCE(tg.minAge, 0)
        AND con.age <= COALESCE(tg.maxAge, 100)
    ` as any[];

    const validContestantIds = endlistContestantIds.map(row => Number(row.contestantId));
    console.log(`Found ${validContestantIds.length} valid contestants in endlist`);

    // Step 3: Find outdated attendanceTeam records (teams not in endlist)
    let outdatedTeams: any[] = [];
    if (validTeamIds.length > 0) {
      // Use $queryRawUnsafe with proper parameter substitution
      const placeholders = validTeamIds.map(() => '?').join(',');
      outdatedTeams = await prisma.$queryRawUnsafe(
        `SELECT Id, teamId FROM attendanceTeam WHERE eventId = ? AND teamId NOT IN (${placeholders})`,
        eventId, ...validTeamIds
      ) as any[];
    } else {
      // If no valid teams, all attendance teams are outdated
      outdatedTeams = await prisma.$queryRaw`
        SELECT Id, teamId FROM attendanceTeam WHERE eventId = ${eventId}
      ` as any[];
    }

    console.log(`Found ${outdatedTeams.length} outdated teams to remove`);

    // Step 4: Find outdated attendanceContestant records (contestants not in endlist)
    let outdatedContestants: any[] = [];
    if (validContestantIds.length > 0) {
      // Use $queryRawUnsafe with proper parameter substitution
      const placeholders = validContestantIds.map(() => '?').join(',');
      outdatedContestants = await prisma.$queryRawUnsafe(
        `SELECT id, contestantId FROM attendanceContestant WHERE eventId = ? AND contestantId NOT IN (${placeholders})`,
        eventId, ...validContestantIds
      ) as any[];
    } else {
      // If no valid contestants, all attendance contestants are outdated
      outdatedContestants = await prisma.$queryRaw`
        SELECT id, contestantId FROM attendanceContestant WHERE eventId = ${eventId}
      ` as any[];
    }

    console.log(`Found ${outdatedContestants.length} outdated contestants to remove`);

    // Step 5: Remove outdated records
    let removedTeams = 0;
    let removedContestants = 0;
    let removedContestantsFromTeams = 0;

    // Remove outdated attendanceContestant records (not in endlist)
    if (outdatedContestants.length > 0) {
      const outdatedContestantIds = outdatedContestants.map(c => Number(c.id));
      const placeholders = outdatedContestantIds.map(() => '?').join(',');
      const deleteContestantsResult = await prisma.$executeRawUnsafe(
        `DELETE FROM attendanceContestant WHERE id IN (${placeholders})`,
        ...outdatedContestantIds
      );
      removedContestants = Number(deleteContestantsResult);
      console.log(`Removed ${removedContestants} outdated contestants`);
    }

    // Remove attendanceContestant records for outdated teams
    if (outdatedTeams.length > 0) {
      const outdatedTeamIds = outdatedTeams.map(t => Number(t.teamId));
      const teamPlaceholders = outdatedTeamIds.map(() => '?').join(',');
      const deleteContestantsFromTeamsResult = await prisma.$executeRawUnsafe(
        `DELETE FROM attendanceContestant WHERE eventId = ? AND teamId IN (${teamPlaceholders})`,
        eventId, ...outdatedTeamIds
      );
      removedContestantsFromTeams = Number(deleteContestantsFromTeamsResult);
      console.log(`Removed ${removedContestantsFromTeams} contestants from outdated teams`);

      // Remove outdated attendanceTeam records
      const outdatedAttendanceTeamIds = outdatedTeams.map(t => Number(t.Id));
      const teamIdPlaceholders = outdatedAttendanceTeamIds.map(() => '?').join(',');
      const deleteTeamsResult = await prisma.$executeRawUnsafe(
        `DELETE FROM attendanceTeam WHERE Id IN (${teamIdPlaceholders})`,
        ...outdatedAttendanceTeamIds
      );
      removedTeams = Number(deleteTeamsResult);
      console.log(`Removed ${removedTeams} outdated teams`);
    }

    const cleanupResults = {
      success: true,
      eventId,
      validTeamsInEndlist: validTeamIds.length,
      validContestantsInEndlist: validContestantIds.length,
      outdatedTeamsFound: outdatedTeams.length,
      outdatedContestantsFound: outdatedContestants.length,
      removedTeams,
      removedContestants,
      removedContestantsFromTeams,
      totalRemovedRecords: removedTeams + removedContestants + removedContestantsFromTeams,
      outdatedTeamsDetails: outdatedTeams.map(t => ({
        teamId: Number(t.teamId)
      })),
      outdatedContestantsDetails: outdatedContestants.map(c => ({
        contestantId: Number(c.contestantId)
      }))
    };

    console.log('Cleanup completed:', cleanupResults);

    return NextResponse.json(cleanupResults);

  } catch (error) {
    console.error('Attendance cleanup error:', error);
    return NextResponse.json({
      error: 'Failed to cleanup attendance records',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
