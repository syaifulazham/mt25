import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string; teamId: string } }
) {
  try {
    console.log('Remove team member API called with params:', params);

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

    console.log(`Removing contestant ${contestantId} from team ${teamId}`);

    // Remove the team member from the teamMember table
    const deleteResult = await prisma.$queryRawUnsafe(
      'DELETE FROM teamMember WHERE teamId = ? AND contestantId = ?',
      parseInt(teamId),
      parseInt(contestantId)
    );

    console.log('Delete result:', deleteResult);

    // Also remove any associated attendance record if it exists
    try {
      await prisma.$queryRawUnsafe(
        'DELETE FROM attendanceContestant WHERE teamId = ? AND contestantId = ? AND eventId = ?',
        parseInt(teamId),
        parseInt(contestantId),
        parseInt(eventId)
      );
      console.log('Associated attendance record removed');
    } catch (attendanceError) {
      console.log('No attendance record to remove or error removing it:', attendanceError);
    }

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully'
    });

  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
