import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isOrganizerOrAdmin } from '@/lib/session';

// API to get contingents with attendance status for manual attendance entry
export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    // Auth check
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await isOrganizerOrAdmin(currentUser.id))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get all contingents for this event with their team counts
    const contingentsWithTeams = await prisma.contingent.findMany({
      where: {
        eventId,
        status: 'ACCEPTED',
      },
      include: {
        _count: {
          select: {
            teams: {
              where: { status: 'ACCEPTED' }
            }
          }
        },
        teams: {
          where: { status: 'ACCEPTED' },
          select: {
            _count: {
              select: {
                contestants: {
                  where: { status: 'ACCEPTED' }
                }
              }
            }
          }
        }
      }
    });

    // Get attendance status for each contingent
    const attendanceRecords = await prisma.attendanceContingent.findMany({
      where: {
        eventId,
        contingentId: {
          in: contingentsWithTeams.map(c => c.id)
        }
      }
    });

    // Map attendance records to contingents
    const contingents = contingentsWithTeams.map(contingent => {
      // Find attendance record for this contingent
      const attendanceRecord = attendanceRecords.find(
        record => record.contingentId === contingent.id
      );

      // Calculate total contestants across all teams
      const contestantCount = contingent.teams.reduce(
        (sum, team) => sum + team._count.contestants, 
        0
      );

      return {
        id: contingent.id,
        name: contingent.name,
        state: contingent.state,
        teamCount: contingent._count.teams,
        contestantCount,
        status: attendanceRecord?.attendanceStatus || 'Not Present',
        attendanceDate: attendanceRecord?.attendanceDate ? 
          attendanceRecord.attendanceDate.toISOString().split('T')[0] : undefined,
        attendanceTime: attendanceRecord?.attendanceTime ? 
          attendanceRecord.attendanceTime.toTimeString().split(' ')[0] : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      contingents
    });
  } catch (error) {
    console.error('Error fetching contingents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contingent data' },
      { status: 500 }
    );
  }
}
