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

    // Query managers for the team with their attendance status
    const managersQuery = `
      SELECT 
        m.id,
        m.name as managerName,
        m.email,
        m.ic,
        m.phoneNumber,
        am.attendanceStatus,
        am.attendanceDate,
        am.attendanceTime,
        t.name as teamName
      FROM manager_team mt
      JOIN manager m ON m.id = mt.managerId
      JOIN team t ON mt.teamId = t.id
      LEFT JOIN attendanceManager am ON am.managerId = m.id AND am.eventId = ?
      WHERE mt.teamId = ?
      ORDER BY m.name ASC
    `;

    const managers = await prisma.$queryRawUnsafe(managersQuery, eventId, teamId) as any[];

    // Process managers to ensure proper data types
    const processedManagers = managers.map(manager => ({
      id: Number(manager.id),
      name: manager.managerName,
      ic: manager.ic,
      email: manager.email,
      phoneNumber: manager.phoneNumber,
      attendanceStatus: manager.attendanceStatus,
      attendanceDate: manager.attendanceDate,
      attendanceTime: manager.attendanceTime,
      teamName: manager.teamName
    }));

    return new NextResponse(JSON.stringify({
      success: true,
      managers: processedManagers
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error fetching managers data for team:', error);
    return new NextResponse(JSON.stringify({
      error: `Failed to fetch managers data: ${error?.message || 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
