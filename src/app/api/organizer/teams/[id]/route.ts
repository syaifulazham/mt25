import { NextResponse } from 'next/server';
import { getCurrentUser, hasRequiredRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/organizer/teams/[id]
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

    // Get the team with all related information
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        contest: {
          select: {
            id: true,
            name: true,
            participationMode: true,
          },
        },
        contingent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        members: {
          include: {
            contestant: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        managers: {
          include: {
            participant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error retrieving team:', error);
    return NextResponse.json(
      { error: 'An error occurred while retrieving the team' },
      { status: 500 }
    );
  }
}

// PUT /api/organizer/teams/[id]
export async function PUT(
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
    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.contestId || !data.contingentId || !data.status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update the team
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
        description: data.description,
        contestId: data.contestId,
        contingentId: data.contingentId,
        status: data.status,
        maxMembers: data.maxMembers || existingTeam.maxMembers,
      },
      include: {
        contest: {
          select: {
            name: true,
          },
        },
        members: {
          select: {
            id: true,
          },
        },
      },
    });

    // Format the response
    return NextResponse.json({
      ...updatedTeam,
      contestName: updatedTeam.contest.name,
      memberCount: updatedTeam.members.length
    });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the team' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizer/teams/[id]
export async function DELETE(
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
    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // First, delete team members
    await prisma.teamMember.deleteMany({
      where: { teamId },
    });

    // Delete team managers
    await prisma.teamManager.deleteMany({
      where: { teamId },
    });

    // Delete independent managers
    await prisma.manager.deleteMany({
      where: { teamId },
    });

    // Finally, delete the team
    await prisma.team.delete({
      where: { id: teamId },
    });

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the team' },
      { status: 500 }
    );
  }
}
