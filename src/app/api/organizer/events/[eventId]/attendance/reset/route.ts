import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    console.log('Reset attendance API called with eventId:', params.eventId);
    
    // Auth check using next-auth session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is an organizer admin (only admins should be able to reset)
    if ((session.user as any).role !== "ADMIN") {
      console.log('Auth failed: Insufficient permissions for reset operation');
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins can reset attendance data.' },
        { status: 403 }
      );
    }
    
    // Parse and validate event ID
    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      console.log('Invalid event ID format');
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
      console.log('Event not found with ID:', eventId);
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Parse request body to get the verification code
    const body = await request.json();
    const { verificationCode, expectedCode } = body;
    
    // Verify the code
    if (!verificationCode || !expectedCode || verificationCode !== expectedCode) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Delete all attendance records for this event using raw SQL queries in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete attendance contestant records
      const deletedContestantsResult = await tx.$executeRaw`
        DELETE FROM attendanceContestant WHERE eventId = ${eventId}
      `;
      
      // Delete attendance team records
      const deletedTeamsResult = await tx.$executeRaw`
        DELETE FROM attendanceTeam WHERE eventId = ${eventId}
      `;
      
      // Delete attendance contingent records
      const deletedContingentsResult = await tx.$executeRaw`
        DELETE FROM attendanceContingent WHERE eventId = ${eventId}
      `;

      // Delete attendance manager records
      const deletedManagersResult = await tx.$executeRaw`
        DELETE FROM attendanceManager WHERE eventId = ${eventId}
      `;

      return {
        deletedContestants: deletedContestantsResult,
        deletedTeams: deletedTeamsResult,
        deletedContingents: deletedContingentsResult,
        deletedManagers: deletedManagersResult,
      };
    });

    console.log(`Reset completed for event ${eventId}:`, result);
    
    return NextResponse.json({
      success: true,
      message: 'Attendance records have been successfully reset (including manager attendance)',
      result
    });
    
  } catch (error) {
    console.error('Error in attendance reset operation:', error);
    return NextResponse.json(
      { error: 'Failed to reset attendance data' },
      { status: 500 }
    );
  }
}
