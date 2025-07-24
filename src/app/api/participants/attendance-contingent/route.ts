import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { prismaExecute } from '@/lib/prisma';

// Dynamic route export
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's contingent and attendance data
    const attendanceData = await prismaExecute(async (prisma) => {
      // First, find the user's contingent
      const userContingent = await prisma.contingentManager.findFirst({
        where: {
          participantId: Number(user.id)
        },
        include: {
          contingent: true
        }
      });

      if (!userContingent) {
        return null;
      }

      // Then find the attendance contingent data for this contingent
      const attendanceContingent = await prisma.attendanceContingent.findFirst({
        where: {
          contingentId: userContingent.contingentId
        },
        select: {
          id: true,
          hashcode: true,
          contingentId: true,
          eventId: true,
          attendanceDate: true,
          attendanceTime: true,
          attendanceStatus: true
        }
      });

      return {
        contingent: userContingent.contingent,
        attendanceContingent
      };
    });

    if (!attendanceData) {
      return NextResponse.json({ 
        error: 'No contingent found for this user' 
      }, { status: 404 });
    }

    if (!attendanceData.attendanceContingent) {
      return NextResponse.json({ 
        error: 'No attendance data found for your contingent' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: attendanceData
    });

  } catch (error) {
    console.error('Error fetching attendance contingent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    );
  }
}
