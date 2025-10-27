import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch eligible events for team transfer
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string; teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role as string;
    if (!session?.user || !['ADMIN', 'OPERATOR'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, teamId } = params;
    
    if (!eventId || !teamId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Convert string parameters to numbers for SQL queries
    const eventIdNum = parseInt(eventId);
    const teamIdNum = parseInt(teamId);

    console.log('Starting transfer API for:', { eventId: eventIdNum, teamId: teamIdNum });

    // Get team details with contest and contingent information
    console.log('Fetching team data...');
    const teamData = await prisma.$queryRaw`
      SELECT 
        t.id as teamId,
        t.name as teamName,
        t.contestId,
        c.name as contestName,
        c.code as contestCode,
        cont.id as contingentId,
        cont.name as contingentName,
        COALESCE(s.name, hi.name, ind.name) as institutionName,
        COALESCE(s.stateId, hi.stateId, ind.stateId) as stateId,
        st.name as stateName,
        st.zoneId as stateZoneId
      FROM team t
      JOIN contest c ON t.contestId = c.id
      JOIN contingent cont ON t.contingentId = cont.id
      LEFT JOIN school s ON cont.schoolId = s.id
      LEFT JOIN higherinstitution hi ON cont.higherInstId = hi.id
      LEFT JOIN independent ind ON cont.independentId = ind.id
      LEFT JOIN state st ON COALESCE(s.stateId, hi.stateId, ind.stateId) = st.id
      WHERE t.id = ${teamIdNum}
      LIMIT 1
    ` as any[];

    console.log('Team data query result:', teamData);

    if (teamData.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const team = teamData[0];
    console.log('Team found:', team);

    // Get current event details
    console.log('Fetching current event data...');
    const currentEvent = await prisma.$queryRaw`
      SELECT id, name, scopeArea, zoneId, stateId
      FROM event 
      WHERE id = ${eventIdNum}
      LIMIT 1
    ` as any[];

    if (currentEvent.length === 0) {
      return NextResponse.json({ error: 'Current event not found' }, { status: 404 });
    }

    const currentEventData = currentEvent[0];

    // Find eligible events based on contest matching only (ignoring scope area)
    let eligibleEventsQuery = `
      SELECT DISTINCT
        e.id,
        e.name,
        e.scopeArea,
        e.startDate,
        e.endDate,
        e.status,
        e.zoneId,
        e.stateId,
        COUNT(ec.id) as contestCount
      FROM event e
      JOIN eventcontest ec ON e.id = ec.eventId
      JOIN contest c ON ec.contestId = c.id
      WHERE e.id != ${eventIdNum}
        -- Status check removed as per requirement
        AND c.code = '${team.contestCode}'
    `;

    // Scope area filtering rules are now ignored as per requirement
    // All events offering the same contest are eligible regardless of scope area

    eligibleEventsQuery += `
      GROUP BY e.id, e.name, e.scopeArea, e.startDate, e.endDate, e.status, e.zoneId, e.stateId
      ORDER BY e.startDate ASC
    `;

    const eligibleEvents = await prisma.$queryRawUnsafe(eligibleEventsQuery) as any[];

    // Convert all BigInt values to Numbers to avoid serialization issues
    const processedTeam = {
      id: Number(team.teamId),
      name: team.teamName,
      contestName: team.contestName,
      contestCode: team.contestCode,
      contingentName: team.contingentName,
      institutionName: team.institutionName,
      stateName: team.stateName,
      contestId: Number(team.contestId),
      contingentId: Number(team.contingentId),
      stateId: Number(team.stateId),
      stateZoneId: Number(team.stateZoneId)
    };

    const processedCurrentEvent = {
      id: Number(currentEventData.id),
      name: currentEventData.name,
      scopeArea: currentEventData.scopeArea,
      zoneId: currentEventData.zoneId ? Number(currentEventData.zoneId) : null,
      stateId: currentEventData.stateId ? Number(currentEventData.stateId) : null
    };

    const processedEligibleEvents = eligibleEvents.map((event: any) => ({
      id: Number(event.id),
      name: event.name,
      scopeArea: event.scopeArea,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
      contestCount: Number(event.contestCount),
      zoneId: event.zoneId ? Number(event.zoneId) : null,
      stateId: event.stateId ? Number(event.stateId) : null
    }));

    return NextResponse.json({
      team: processedTeam,
      currentEvent: processedCurrentEvent,
      eligibleEvents: processedEligibleEvents
    });

  } catch (error) {
    console.error('Error fetching eligible events:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      eventId: params.eventId,
      teamId: params.teamId
    });
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Transfer team to another event
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role as string;
    if (!session?.user || !['ADMIN', 'OPERATOR'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, teamId } = params;
    
    if (!eventId || !teamId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Convert string parameters to numbers for SQL queries
    const eventIdNum = parseInt(eventId);
    const teamIdNum = parseInt(teamId);
    
    const { targetEventId } = await request.json();

    if (!targetEventId) {
      return NextResponse.json({ error: 'Target event ID is required' }, { status: 400 });
    }
    
    const targetEventIdNum = parseInt(targetEventId);

    // Get team and contest information
    const teamData = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id as teamId,
        t.name as teamName,
        t.contestId,
        c.code as contestCode
      FROM team t
      JOIN contest c ON t.contestId = c.id
      WHERE t.id = ?
      LIMIT 1
    `, teamIdNum) as any[];

    if (teamData.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const team = teamData[0];

    // Find the contest in the target event
    const targetEventContest = await prisma.$queryRawUnsafe(`
      SELECT ec.id as eventContestId
      FROM eventcontest ec
      JOIN contest c ON ec.contestId = c.id
      WHERE ec.eventId = ?
        AND c.code = ?
      LIMIT 1
    `, targetEventIdNum, team.contestCode) as any[];

    if (targetEventContest.length === 0) {
      return NextResponse.json({ 
        error: 'Target event does not offer the required contest' 
      }, { status: 400 });
    }

    const targetEventContestId = Number(targetEventContest[0].eventContestId);

    // Start transaction to transfer the team
    console.log('Starting transaction with params:', {
      teamIdNum,
      eventIdNum,
      targetEventIdNum,
      targetEventContestId
    });
    
    await prisma.$transaction(async (tx) => {
      try {
        console.log('Step 1: Removing team from current event...');
        // Remove team from current event
        await tx.$executeRawUnsafe(`
          DELETE FROM eventcontestteam 
          WHERE teamId = ? 
          AND eventcontestId IN (
            SELECT id FROM eventcontest WHERE eventId = ?
          )
        `, teamIdNum, eventIdNum);
        console.log('Step 1: Completed successfully');

        console.log('Step 2: Adding team to target event...');
        // Add team to target event
        await tx.$executeRawUnsafe(`
          INSERT INTO eventcontestteam (eventcontestId, teamId, status, createdAt, updatedAt)
          VALUES (?, ?, 'APPROVED', NOW(), NOW())
        `, targetEventContestId, teamIdNum);
        console.log('Step 2: Completed successfully');

        console.log('Step 3: Removing attendance contestant records...');
        // Remove attendance records from current event
        await tx.$executeRawUnsafe(`
          DELETE FROM attendanceContestant 
          WHERE teamId = ? AND eventId = ?
        `, teamIdNum, eventIdNum);
        console.log('Step 3: Completed successfully');

        console.log('Step 4: Removing attendance team records...');
        await tx.$executeRawUnsafe(`
          DELETE FROM attendanceTeam 
          WHERE teamId = ? AND eventId = ?
        `, teamIdNum, eventIdNum);
        console.log('Step 4: Completed successfully');
      } catch (txError) {
        console.error('Transaction step failed:', txError);
        throw txError;
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Team transferred successfully' 
    });

  } catch (error) {
    console.error('Error transferring team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
