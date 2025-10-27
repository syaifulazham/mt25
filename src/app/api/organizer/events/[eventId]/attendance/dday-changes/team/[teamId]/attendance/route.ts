import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { eventId: string; teamId: string } }) {
  try {
    // Verify user is authorized for this operation
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.role || !['ADMIN', 'OPERATOR', 'admin', 'operator'].includes(session.user.role)) {
      return new NextResponse(JSON.stringify({
        error: 'Unauthorized. Only admins and operators can access D-Day changes.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const eventId = parseInt(params.eventId);
    const teamId = parseInt(params.teamId);

    if (!eventId || isNaN(eventId) || !teamId || isNaN(teamId)) {
      return new NextResponse(JSON.stringify({
        error: 'Invalid or missing eventId or teamId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Query attendance records for team members
    const attendanceQuery = `
      SELECT 
        ac.id,
        ac.contestantId,
        con.name as participantName,
        ac.ic,
        ac.attendanceStatus,
        ac.attendanceDate,
        ac.attendanceTime,
        ac.attendanceNote,
        t.name as teamName,
        c.name as contestName
      FROM attendanceContestant ac
      JOIN contestant con ON ac.contestantId = con.id
      JOIN team t ON ac.teamId = t.id
      JOIN contest c ON t.contestId = c.id
      WHERE ac.teamId = ? AND ac.eventId = ?
      ORDER BY con.name ASC
    `;

    const attendanceMembers = await prisma.$queryRawUnsafe(attendanceQuery, teamId, eventId) as any[];

    // Process attendance members to ensure proper data types
    const processedMembers = attendanceMembers.map(member => ({
      id: Number(member.id),
      contestantId: Number(member.contestantId),
      name: member.participantName,
      ic: member.ic,
      attendanceStatus: member.attendanceStatus,
      attendanceDate: member.attendanceDate,
      attendanceTime: member.attendanceTime,
      attendanceNote: member.attendanceNote,
      teamName: member.teamName,
      contestName: member.contestName
    }));

    return new NextResponse(JSON.stringify({
      success: true,
      members: processedMembers
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error fetching attendance data for team:', error);
    return new NextResponse(JSON.stringify({
      error: `Failed to fetch attendance data: ${error?.message || 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
