import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get eventId from query parameters
    const searchParams = req.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Query to find states with participating teams in this event
    const query = `
      SELECT DISTINCT
        s.id,
        s.name,
        s.abbreviation
      FROM
        attendanceTeam at
      JOIN
        contingent c ON at.contingentId = c.id
      LEFT JOIN
        state s ON
        CASE
          WHEN c.contingentType = 'SCHOOL' THEN (
            SELECT s2.id FROM state s2
            JOIN school sch ON sch.stateId = s2.id
            WHERE c.schoolId = sch.id
          )
          WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN (
            SELECT s2.id FROM state s2
            JOIN higherinstitution hi ON hi.stateId = s2.id
            WHERE c.higherInstitutionId = hi.id
          )
          WHEN c.contingentType = 'INDEPENDENT' THEN (
            SELECT s2.id FROM state s2
            JOIN independent ind ON ind.stateId = s2.id
            WHERE c.independentId = ind.id
          )
          ELSE NULL
        END = s.id
      WHERE
        at.eventId = ${parseInt(eventId)}
        AND s.id IS NOT NULL
      ORDER BY
        s.name ASC
    `;

    const states = await prisma.$queryRawUnsafe(query) as any[];

    // Format results - Convert BigInt values to numbers
    const formattedStates = states.map(state => ({
      id: Number(state.id),
      name: state.name,
      abbreviation: state.abbreviation
    }));

    return NextResponse.json(formattedStates);
  } catch (error) {
    console.error('Error fetching participating states:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch participating states',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
