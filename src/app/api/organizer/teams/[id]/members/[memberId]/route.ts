import { NextResponse } from 'next/server';
import { getCurrentUser, hasRequiredRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/organizer/teams/[id]/members/[memberId]
export async function GET(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
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
    const memberId = parseInt(params.memberId);
    
    if (isNaN(teamId) || isNaN(memberId)) {
      return NextResponse.json({ error: 'Invalid ID parameters' }, { status: 400 });
    }

    // Get the team member with contestant details
    const member = await prisma.teamMember.findUnique({
      where: {
        id: memberId,
      },
      include: {
        contestant: true,
        team: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Ensure the member belongs to the specified team
    if (member.teamId !== teamId) {
      return NextResponse.json(
        { error: 'Team member does not belong to the specified team' },
        { status: 400 }
      );
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error('Error retrieving team member:', error);
    return NextResponse.json(
      { error: 'An error occurred while retrieving the team member' },
      { status: 500 }
    );
  }
}

// PUT /api/organizer/teams/[id]/members/[memberId]
export async function PUT(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
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
    const memberId = parseInt(params.memberId);
    
    if (isNaN(teamId) || isNaN(memberId)) {
      return NextResponse.json({ error: 'Invalid ID parameters' }, { status: 400 });
    }

    // Check if the team member exists
    const member = await prisma.teamMember.findUnique({
      where: {
        id: memberId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Ensure the member belongs to the specified team
    if (member.teamId !== teamId) {
      return NextResponse.json(
        { error: 'Team member does not belong to the specified team' },
        { status: 400 }
      );
    }

    const data = await request.json();
    
    // Update the team member (only role can be updated)
    const updatedMember = await prisma.teamMember.update({
      where: {
        id: memberId,
      },
      data: {
        role: data.role,
      },
      include: {
        contestant: true,
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the team member' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizer/teams/[id]/members/[memberId]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
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
    const memberId = parseInt(params.memberId);
    
    if (isNaN(teamId) || isNaN(memberId)) {
      return NextResponse.json({ error: 'Invalid ID parameters' }, { status: 400 });
    }

    // Check if the team member exists
    const member = await prisma.teamMember.findUnique({
      where: {
        id: memberId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Ensure the member belongs to the specified team
    if (member.teamId !== teamId) {
      return NextResponse.json(
        { error: 'Team member does not belong to the specified team' },
        { status: 400 }
      );
    }

    // Remove the team member
    await prisma.teamMember.delete({
      where: {
        id: memberId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'An error occurred while removing the team member' },
      { status: 500 }
    );
  }
}
