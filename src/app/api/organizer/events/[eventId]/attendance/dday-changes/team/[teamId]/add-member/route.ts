import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; teamId: string } }
) {
  try {
    console.log('Add team member API called with params:', params);

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'OPERATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, teamId } = params;
    const { contestantId } = await request.json();

    if (!contestantId) {
      return NextResponse.json({ error: 'Contestant ID is required' }, { status: 400 });
    }

    console.log(`Adding contestant ${contestantId} to team ${teamId}`);

    // First, check if the team has reached its maximum members
    const teamInfo = await prisma.$queryRawUnsafe(`
      SELECT t.id, t.name as teamName, c.maxMembersPerTeam as maxMembers, COUNT(tm.contestantId) as currentMembers
      FROM team t
      JOIN contest c ON t.contestId = c.id
      LEFT JOIN teamMember tm ON tm.teamId = t.id
      WHERE t.id = ?
      GROUP BY t.id, t.name, c.maxMembersPerTeam
    `, parseInt(teamId)) as any[];

    if (teamInfo.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const team = teamInfo[0];
    const currentMembers = Number(team.currentMembers);
    const maxMembers = Number(team.maxMembers);

    console.log(`Team ${team.teamName}: ${currentMembers}/${maxMembers} members`);

    if (currentMembers >= maxMembers) {
      return NextResponse.json({ 
        error: `Team has reached maximum capacity (${maxMembers} members)` 
      }, { status: 400 });
    }

    // Check if contestant is already in another team for this contest
    const existingTeamMember = await prisma.$queryRawUnsafe(`
      SELECT tm.id, t.name as teamName
      FROM teamMember tm
      JOIN team t ON tm.teamId = t.id
      JOIN contest c ON t.contestId = c.id
      JOIN eventcontest ec ON ec.contestId = c.id
      WHERE tm.contestantId = ? AND ec.eventId = ?
    `, parseInt(contestantId), parseInt(eventId)) as any[];

    if (existingTeamMember.length > 0) {
      return NextResponse.json({ 
        error: `Contestant is already in team: ${existingTeamMember[0].teamName}` 
      }, { status: 400 });
    }

    // Check if contestant exists and is from the same contingent as the team
    const contestantInfo = await prisma.$queryRawUnsafe(`
      SELECT con.id, con.name, con.contingentId, cont.name as contingentName
      FROM contestant con
      JOIN contingent cont ON con.contingentId = cont.id
      WHERE con.id = ?
    `, parseInt(contestantId)) as any[];

    if (contestantInfo.length === 0) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 });
    }

    const contestant = contestantInfo[0];

    // Get team's contingent
    const teamContingent = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT cont.id, cont.name
      FROM team t
      JOIN teamMember tm ON tm.teamId = t.id
      JOIN contestant con ON tm.contestantId = con.id
      JOIN contingent cont ON con.contingentId = cont.id
      WHERE t.id = ?
      LIMIT 1
    `, parseInt(teamId)) as any[];

    if (teamContingent.length > 0 && teamContingent[0].id !== contestant.contingentId) {
      return NextResponse.json({ 
        error: `Contestant is from ${contestant.contingentName}, but team is from ${teamContingent[0].name}` 
      }, { status: 400 });
    }

    // Add the contestant to the team
    await prisma.$queryRawUnsafe(
      'INSERT INTO teamMember (teamId, contestantId, joinedAt) VALUES (?, ?, NOW())',
      parseInt(teamId),
      parseInt(contestantId)
    );

    console.log(`Successfully added contestant ${contestant.name} to team ${team.teamName}`);

    return NextResponse.json({
      success: true,
      message: `${contestant.name} has been added to the team`,
      teamMembers: currentMembers + 1,
      maxMembers: maxMembers
    });

  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
