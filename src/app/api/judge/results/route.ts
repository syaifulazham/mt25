import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hashcode = searchParams.get('hashcode');
    const eventId = searchParams.get('eventId');
    const contestId = searchParams.get('contestId');

    if (!hashcode || !eventId || !contestId) {
      return NextResponse.json(
        { error: 'Hashcode, eventId, and contestId are required' },
        { status: 400 }
      );
    }

    // Verify judge endpoint exists
    const judgeEndpoint = await prisma.judges_endpoints.findFirst({
      where: {
        hashcode: hashcode,
        eventId: parseInt(eventId),
        contestId: parseInt(contestId)
      }
    });

    if (!judgeEndpoint) {
      return NextResponse.json(
        { error: 'Invalid judge endpoint' },
        { status: 401 }
      );
    }

    // Fetch teams with their judging results
    const teams = await prisma.$queryRaw`
      SELECT 
        at.id as attendanceTeamId,
        t.name as teamName,
        c.name as contingentName,
        c.id as contingentId,
        c.logoUrl as contingentLogoUrl,
        c.contingentType as contingentType,
        e.name as eventName,
        e.scopeArea as eventScopeArea,
        CASE
          WHEN c.contingentType = 'SCHOOL' THEN (
            SELECT s2.name FROM state s2
            JOIN school sch ON sch.stateId = s2.id
            WHERE c.schoolId = sch.id
          )
          WHEN c.contingentType = 'INDEPENDENT' THEN (
            SELECT s2.name FROM state s2
            JOIN independent ind ON ind.stateId = s2.id
            WHERE c.independentId = ind.id
          )
          ELSE NULL
        END as stateName,
        COALESCE(js.status, 'NOT_STARTED') as judgingStatus,
        js.totalScore
      FROM attendanceteam at
      JOIN team t ON at.teamId = t.id
      JOIN contingent c ON at.contingentId = c.id
      JOIN event e ON at.eventId = e.id
      JOIN eventcontest ec ON ec.eventId = at.eventId AND ec.contestId = ${parseInt(contestId)}
      LEFT JOIN judgingsession js ON js.attendanceTeamId = at.id AND js.eventContestId = ec.id
      WHERE at.eventId = ${parseInt(eventId)}
        AND at.attendanceStatus = 'PRESENT'
      ORDER BY 
        CASE 
          WHEN js.totalScore IS NULL THEN 1 
          ELSE 0 
        END,
        js.totalScore DESC,
        t.name ASC
    ` as any[];

    // Add ranking to results
    const results = teams.map((team, index) => {
      // Calculate rank based on score (teams with same score get same rank)
      let rank = 1;
      if (index > 0 && team.totalScore !== null) {
        const prevTeam = teams[index - 1];
        if (prevTeam.totalScore !== null && Number(team.totalScore) < Number(prevTeam.totalScore)) {
          // Find how many teams have higher scores
          rank = teams.filter((t, i) => i < index && t.totalScore !== null && Number(t.totalScore) > Number(team.totalScore)).length + 1;
        } else if (prevTeam.totalScore !== null && Number(team.totalScore) === Number(prevTeam.totalScore)) {
          // Same score as previous team, find the rank of the first team with this score
          const firstWithSameScore = teams.findIndex(t => t.totalScore !== null && Number(t.totalScore) === Number(team.totalScore));
          rank = teams.filter((t, i) => i < firstWithSameScore && t.totalScore !== null && Number(t.totalScore) > Number(team.totalScore)).length + 1;
        }
      } else if (team.totalScore === null) {
        // Teams without scores are not ranked
        rank = 0;
      }

      return {
        attendanceTeamId: team.attendanceTeamId,
        teamName: team.teamName,
        contingentName: team.contingentName,
        contingentId: team.contingentId,
        contingentLogoUrl: team.contingentLogoUrl,
        stateName: team.stateName,
        eventName: team.eventName,
        eventScopeArea: team.eventScopeArea,
        judgingStatus: team.judgingStatus,
        totalScore: team.totalScore ? parseFloat(team.totalScore.toString()) : null,
        rank: rank
      };
    });

    return NextResponse.json({
      results: results || []
    });
  } catch (error) {
    console.error('Error fetching results for judge:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}
