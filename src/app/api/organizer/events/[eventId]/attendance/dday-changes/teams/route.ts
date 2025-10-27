import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    // Verify user is authorized for this operation
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.role || !['ADMIN', 'OPERATOR', 'admin', 'operator'].includes(session.user.role)) {
      return new NextResponse(JSON.stringify({
        error: 'Unauthorized. Only admins and operators can access D-Day changes.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const eventId = parseInt(params.eventId);

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

    // Query teams for the event with related data (using correct schema relationships)
    const teamsQuery = `
      SELECT DISTINCT
        t.id,
        t.name as teamName,
        c.name as contestName,
        cont.name as contingentName,
        ect.status,
        CASE 
          WHEN cont.contingentType = 'SCHOOL' THEN s.name
          WHEN cont.contingentType = 'HIGHER_INSTITUTION' THEN hi.name
          WHEN cont.contingentType = 'INDEPENDENT' THEN i.name
          ELSE 'Unknown'
        END as institutionName,
        CASE 
          WHEN cont.contingentType = 'SCHOOL' THEN st.name
          WHEN cont.contingentType = 'HIGHER_INSTITUTION' THEN st2.name
          WHEN cont.contingentType = 'INDEPENDENT' THEN st3.name
          ELSE 'Unknown'
        END as stateName
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      JOIN contest c ON ec.contestId = c.id
      JOIN teamMember tm ON t.id = tm.teamId
      JOIN contestant con ON tm.contestantId = con.id
      JOIN contingent cont ON con.contingentId = cont.id
      LEFT JOIN school s ON cont.schoolId = s.id
      LEFT JOIN state st ON s.stateId = st.id
      LEFT JOIN higherinstitution hi ON cont.higherInstId = hi.id
      LEFT JOIN state st2 ON hi.stateId = st2.id
      LEFT JOIN independent i ON cont.independentId = i.id
      LEFT JOIN state st3 ON i.stateId = st3.id
      WHERE ec.eventId = ?
        AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
      ORDER BY cont.name ASC, t.name ASC
    `;

    const teams = await prisma.$queryRawUnsafe(teamsQuery, eventId) as any[];

    // Get member counts separately to avoid complex GROUP BY issues
    const teamsWithMemberCounts = await Promise.all(
      teams.map(async (team) => {
        const memberCountQuery = `
          SELECT COUNT(*) as memberCount
          FROM teamMember tm
          WHERE tm.teamId = ?
        `;
        const memberCountResult = await prisma.$queryRawUnsafe(memberCountQuery, team.id) as any[];
        const memberCount = Number(memberCountResult[0]?.memberCount || 0);
        
        return {
          ...team,
          memberCount
        };
      })
    );

    // Process teams to ensure proper data types
    const processedTeams = teamsWithMemberCounts.map(team => ({
      id: Number(team.id),
      name: team.teamName,
      contestName: team.contestName,
      contingentName: team.contingentName,
      stateName: team.stateName,
      status: team.status,
      memberCount: Number(team.memberCount || 0),
      institutionName: team.institutionName
    }));

    return new NextResponse(JSON.stringify({
      success: true,
      teams: processedTeams
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error fetching teams for D-Day changes:', error);
    return new NextResponse(JSON.stringify({
      error: `Failed to fetch teams: ${error?.message || 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
