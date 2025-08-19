import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';

// API to check in all attendance records for a contingent
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; contingentId: string } }
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
    const contingentId = parseInt(params.contingentId);

    if (isNaN(eventId) || isNaN(contingentId)) {
      return NextResponse.json(
        { error: 'Invalid event ID or contingent ID' },
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

    // Check if contingent exists
    const contingent = await prisma.$queryRaw`
      SELECT c.id, c.name 
      FROM contingent c
      WHERE c.id = ${contingentId}
      AND EXISTS (
        SELECT 1 FROM team t 
        WHERE t.contingentId = c.id 
        AND EXISTS (
          SELECT 1 FROM eventcontestteam ect 
          JOIN eventcontest ec ON ect.eventcontestId = ec.id
          WHERE ect.teamId = t.id AND ec.eventId = ${eventId}
        )
      )
      LIMIT 1
    ` as any[];

    if (!contingent || contingent.length === 0) {
      return NextResponse.json(
        { error: 'Contingent not found for this event' },
        { status: 404 }
      );
    }

    const now = new Date();
    let updatedRecords = 0;

    // Update all attendance records to 'Present' status
    await prisma.$transaction(async (tx) => {
      // 1. Update attendanceContingent record
      const contingentUpdateResult = await tx.$executeRaw`
        UPDATE attendanceContingent
        SET attendanceStatus = 'Present',
            attendanceDate = ${now},
            attendanceTime = ${now},
            updatedAt = ${now}
        WHERE contingentId = ${contingentId} AND eventId = ${eventId}
      `;
      updatedRecords += Number(contingentUpdateResult);

      // 2. Update all attendanceTeam records for this contingent
      const teamUpdateResult = await tx.$executeRaw`
        UPDATE attendanceTeam at
        SET attendanceStatus = 'Present',
            attendanceDate = ${now},
            attendanceTime = ${now},
            updatedAt = ${now}
        WHERE at.eventId = ${eventId}
        AND EXISTS (
          SELECT 1 FROM team t 
          WHERE t.id = at.teamId 
          AND t.contingentId = ${contingentId}
        )
      `;
      updatedRecords += Number(teamUpdateResult);

      // 3. Update all attendanceContestant records for this contingent
      const contestantUpdateResult = await tx.$executeRaw`
        UPDATE attendanceContestant ac
        SET attendanceStatus = 'Present',
            attendanceDate = ${now},
            attendanceTime = ${now},
            updatedAt = ${now}
        WHERE ac.eventId = ${eventId}
        AND EXISTS (
          SELECT 1 FROM contestant c 
          WHERE c.id = ac.contestantId 
          AND c.contingentId = ${contingentId}
        )
      `;
      updatedRecords += Number(contestantUpdateResult);

      // 4. Update all attendanceManager records for this contingent
      const managerUpdateResult = await tx.$executeRaw`
        UPDATE attendanceManager am
        SET attendanceStatus = 'Present',
            attendanceDate = ${now},
            attendanceTime = ${now},
            updatedAt = ${now}
        WHERE am.eventId = ${eventId}
        AND EXISTS (
          SELECT 1 FROM contingentManager cm 
          WHERE cm.id = am.managerId 
          AND cm.contingentId = ${contingentId}
        )
      `;
      updatedRecords += Number(managerUpdateResult);
    });

    return NextResponse.json({
      success: true,
      message: 'Contingent checked in successfully',
      contingentId,
      contingentName: contingent[0].name,
      updatedRecords,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error checking in contingent:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Event ID:', params.eventId, 'Contingent ID:', params.contingentId);
    return NextResponse.json(
      { error: 'Failed to check in contingent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
