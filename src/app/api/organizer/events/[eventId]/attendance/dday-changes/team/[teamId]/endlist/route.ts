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

    // Query team members from endlist (current registration data)
    const membersQuery = `
      SELECT 
        con.id,
        con.name as participantName,
        con.email,
        con.ic,
        con.edu_level,
        con.class_grade,
        con.age,
        CASE 
          WHEN LOWER(con.class_grade) = 'ppki' THEN con.class_grade
          WHEN con.edu_level = 'sekolah rendah' THEN CONCAT('Darjah ', COALESCE(con.class_grade, ''))
          WHEN con.edu_level = 'sekolah menengah' THEN CONCAT('Tingkatan ', COALESCE(con.class_grade, ''))
          ELSE CONCAT('Darjah/ Tingkatan ', COALESCE(con.class_grade, ''))
        END as formattedClassGrade,
        t.name as teamName,
        c.name as contestName
      FROM teamMember tm
      JOIN contestant con ON tm.contestantId = con.id
      JOIN team t ON tm.teamId = t.id
      JOIN contest c ON t.contestId = c.id
      JOIN eventcontest ec ON ec.contestId = c.id AND ec.eventId = ?
      WHERE tm.teamId = ?
      ORDER BY con.name ASC
    `;

    const members = await prisma.$queryRawUnsafe(membersQuery, eventId, teamId) as any[];

    // Process members to ensure proper data types
    const processedMembers = members.map(member => ({
      id: Number(member.id),
      name: member.participantName,
      ic: member.ic,
      age: Number(member.age),
      email: member.email,
      classGrade: member.formattedClassGrade,
      eduLevel: member.edu_level,
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
    console.error('Error fetching endlist data for team:', error);
    return new NextResponse(JSON.stringify({
      error: `Failed to fetch endlist data: ${error?.message || 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
