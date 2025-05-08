import { NextResponse } from 'next/server';
import { getCurrentUser, hasRequiredRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/organizer/teams/[id]/members
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const user = await getCurrentUser();
    if (!user || !('role' in user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const teamId = parseInt(params.id);
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get team members with contestant details
    const members = await prisma.teamMember.findMany({
      where: {
        teamId: teamId,
      },
      include: {
        contestant: true,
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error retrieving team members:', error);
    return NextResponse.json(
      { error: 'An error occurred while retrieving team members' },
      { status: 500 }
    );
  }
}

// POST /api/organizer/teams/[id]/members
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const user = await getCurrentUser();
    if (!user || !('role' in user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const teamId = parseInt(params.id);
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.contestantId) {
      return NextResponse.json(
        { error: 'Missing required field: contestantId is required' },
        { status: 400 }
      );
    }

    // Check if team exists and get max members
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: { id: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if team is at max capacity
    if (team.members.length >= team.maxMembers) {
      return NextResponse.json(
        { error: `Team has reached its maximum capacity of ${team.maxMembers} members` },
        { status: 400 }
      );
    }

    // Check if contestant exists
    const contestant = await prisma.contestant.findUnique({
      where: { id: data.contestantId },
    });

    if (!contestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 });
    }

    // Check if contestant is already a member of this team
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        contestantId: data.contestantId,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'Contestant is already a member of this team' },
        { status: 409 }
      );
    }

    // Create the team membership
    const newMember = await prisma.teamMember.create({
      data: {
        teamId: teamId,
        contestantId: data.contestantId,
        role: data.role || null,
      },
      include: {
        contestant: true,
      },
    });

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json(
      { error: 'An error occurred while adding the team member' },
      { status: 500 }
    );
  }
}
