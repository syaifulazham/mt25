import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { eventId: string; teamId: string } }) {
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
    const teamId = parseInt(params.teamId);

    if (!eventId || isNaN(eventId) || !teamId || isNaN(teamId)) {
      return new NextResponse(JSON.stringify({
        error: 'Invalid or missing eventId or teamId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // First, get the contingent ID for the selected team
    const teamContingentQuery = `
      SELECT DISTINCT cont.id as contingentId
      FROM team t
      JOIN teamMember tm ON t.id = tm.teamId
      JOIN contestant con ON tm.contestantId = con.id
      JOIN contingent cont ON con.contingentId = cont.id
      WHERE t.id = ?
      LIMIT 1
    `;

    const teamContingentResult = await prisma.$queryRawUnsafe(teamContingentQuery, teamId) as any[];

    if (teamContingentResult.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'Could not find contingent for this team'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contingentId = teamContingentResult[0].contingentId;

    // Query all contestants from the same contingent with their team registration status
    const contingentContestantsQuery = `
      SELECT 
        con.id,
        con.name as contestantName,
        con.ic,
        con.age,
        con.email,
        con.edu_level,
        con.class_grade,
        CASE 
          WHEN LOWER(con.class_grade) = 'ppki' THEN con.class_grade
          WHEN con.edu_level = 'sekolah rendah' THEN CONCAT('Darjah ', COALESCE(con.class_grade, ''))
          WHEN con.edu_level = 'sekolah menengah' THEN CONCAT('Tingkatan ', COALESCE(con.class_grade, ''))
          ELSE CONCAT('Darjah/ Tingkatan ', COALESCE(con.class_grade, ''))
        END as formattedClassGrade,
        -- Check if contestant is registered to any team for this event
        CASE 
          WHEN tm.teamId IS NOT NULL THEN 'REGISTERED'
          ELSE 'AVAILABLE'
        END as registrationStatus,
        t.name as teamName,
        t.id as teamId,
        c.name as contestName,
        -- Check if the team is approved for this event
        ect.status as teamStatus
      FROM contestant con
      JOIN contingent cont ON con.contingentId = cont.id
      LEFT JOIN teamMember tm ON con.id = tm.contestantId
      LEFT JOIN team t ON tm.teamId = t.id
      LEFT JOIN contest c ON t.contestId = c.id
      LEFT JOIN eventcontestteam ect ON ect.teamId = t.id
      LEFT JOIN eventcontest ec ON ec.contestId = c.id AND ec.eventId = ?
      WHERE cont.id = ?
        AND con.status = 'ACTIVE'
        -- Only include teams that are registered for this event (or no team at all)
        AND (t.id IS NULL OR ec.eventId IS NOT NULL)
      ORDER BY 
        CASE WHEN tm.teamId IS NOT NULL THEN 0 ELSE 1 END, -- Registered contestants first
        con.name ASC
    `;

    const contestants = await prisma.$queryRawUnsafe(contingentContestantsQuery, eventId, contingentId) as any[];

    // Process contestants to ensure proper data types and group by registration status
    const processedContestants = contestants.map(contestant => ({
      id: Number(contestant.id),
      name: contestant.contestantName,
      ic: contestant.ic,
      age: Number(contestant.age || 0),
      email: contestant.email,
      eduLevel: contestant.edu_level,
      classGrade: contestant.formattedClassGrade,
      registrationStatus: contestant.registrationStatus,
      teamName: contestant.teamName,
      teamId: contestant.teamId ? Number(contestant.teamId) : null,
      contestName: contestant.contestName,
      teamStatus: contestant.teamStatus
    }));

    // Separate registered and available contestants
    const registeredContestants = processedContestants.filter(c => c.registrationStatus === 'REGISTERED');
    const availableContestants = processedContestants.filter(c => c.registrationStatus === 'AVAILABLE');

    return new NextResponse(JSON.stringify({
      success: true,
      contingentId: Number(contingentId),
      contestants: {
        registered: registeredContestants,
        available: availableContestants,
        total: processedContestants.length,
        registeredCount: registeredContestants.length,
        availableCount: availableContestants.length
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error fetching contingent contestants:', error);
    return new NextResponse(JSON.stringify({
      error: `Failed to fetch contingent contestants: ${error?.message || 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
