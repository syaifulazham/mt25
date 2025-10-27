import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';

// API to get contingents with attendance status for manual attendance entry
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is an organizer admin or operator
    if (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
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

    // Get contingents with attendance data and counts from attendance tables
    const contingentsData = await prisma.$queryRaw`
      SELECT DISTINCT
        ac.id as attendanceId,
        ac.contingentId,
        c.name as contingentName,
        ac.state,
        ac.attendanceStatus,
        ac.attendanceDate,
        ac.attendanceTime,
        (SELECT COUNT(*) FROM attendanceTeam WHERE eventId = ${eventId} AND contingentId = ac.contingentId) as teamCount,
        (SELECT COUNT(*) FROM attendanceContestant WHERE eventId = ${eventId} AND contingentId = ac.contingentId) as contestantCount,
        (SELECT COUNT(*) FROM attendanceManager WHERE eventId = ${eventId} AND contingentId = ac.contingentId) as managerCount
      FROM attendanceContingent ac
      JOIN contingent c ON ac.contingentId = c.id
      WHERE ac.eventId = ${eventId}
      ORDER BY c.name
    ` as any[];

    console.log('Found contingents with attendance data:', contingentsData.length);

    // Transform the data to match the expected interface
    const contingents = contingentsData.map((row: any) => ({
      id: `${row.attendanceId}`,
      contingentId: row.contingentId,
      contingentName: row.contingentName,
      state: row.state || 'Unknown',
      teamCount: Number(row.teamCount || 0),
      contestantCount: Number(row.contestantCount || 0),
      managerCount: Number(row.managerCount || 0),
      attendanceStatus: row.attendanceStatus || 'Not Checked In',
      attendanceDate: row.attendanceDate ? 
        new Date(row.attendanceDate).toISOString().split('T')[0] : undefined,
      attendanceTime: row.attendanceTime ? 
        row.attendanceTime.toString().split(' ')[0] : undefined,
    }));

    return NextResponse.json({
      success: true,
      contingents
    });
  } catch (error) {
    console.error('Error fetching contingents:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to fetch contingent data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
