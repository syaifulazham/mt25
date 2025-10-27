import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // Verify user is authorized
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.role || !['ADMIN', 'OPERATOR', 'admin', 'operator'].includes(session.user.role)) {
      return new NextResponse(JSON.stringify({
        error: 'Unauthorized. Only admins and operators can access manager emails.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const eventId = parseInt(params.eventId);
    
    // Validate parameters
    if (!eventId || isNaN(eventId)) {
      return new NextResponse(JSON.stringify({
        error: 'Invalid or missing eventId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure event exists
    const event = await prisma.event.findUnique({
      where: {
        id: eventId
      }
    });
    
    if (!event) {
      return new NextResponse(JSON.stringify({
        error: `Event with ID ${eventId} not found`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Query to get managers with contingent name and state information
    const managers = await prisma.$queryRaw`
      SELECT 
        am.id,
        m.name,
        am.email,
        am.email_status,
        am.state,
        am.attendanceStatus,
        CASE 
          WHEN c.contingentType = 'SCHOOL' THEN s.name
          WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN hi.name
          WHEN c.contingentType = 'INDEPENDENT' THEN i.name
          ELSE 'Unknown'
        END as contingentName
      FROM 
        attendanceManager am
      JOIN 
        manager m ON am.managerId = m.id
      JOIN 
        contingent c ON am.contingentId = c.id
      LEFT JOIN 
        school s ON c.schoolId = s.id
      LEFT JOIN 
        higherinstitution hi ON c.higherInstId = hi.id
      LEFT JOIN 
        independent i ON c.independentId = i.id
      WHERE 
        am.eventId = ${eventId}
      ORDER BY
        am.state ASC,
        contingentName ASC,
        m.name ASC
    `;

    return new NextResponse(JSON.stringify({
      success: true,
      managers
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    console.error('Error fetching managers:', error);
    return new NextResponse(JSON.stringify({
      error: `Failed to fetch managers: ${error?.message || 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
