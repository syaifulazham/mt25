import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Dynamic route export
export const dynamic = 'force-dynamic';

// POST handler for attendance check-in via QR code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Check-in request body:', body);
    
    const { eventId, endpointhash, hashcode } = body;

    if (!eventId || !endpointhash || !hashcode) {
      console.log('Missing fields - eventId:', eventId, 'endpointhash:', endpointhash, 'hashcode:', hashcode);
      return NextResponse.json(
        { error: "Missing required fields: eventId, endpointhash, hashcode" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Parse eventId to ensure it's a number
    const parsedEventId = parseInt(eventId.toString());
    console.log('Parsed eventId:', parsedEventId);
    if (isNaN(parsedEventId)) {
      console.log('Invalid eventId - NaN');
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Validate the attendance endpoint exists using raw SQL
    console.log('Querying endpoint with eventId:', parsedEventId, 'endpointhash:', endpointhash);
    const endpointResult = await prisma.$queryRaw`
      SELECT ae.*, e.name, e.startDate, e.endDate 
      FROM attendance_endpoint ae
      JOIN event e ON ae.eventId = e.id
      WHERE ae.eventId = ${parsedEventId} AND ae.endpointhash = ${endpointhash}
      LIMIT 1
    `;

    console.log('Endpoint query result:', endpointResult);
    const endpoints = endpointResult as any[];
    if (!endpoints || endpoints.length === 0) {
      console.log('No endpoint found');
      return NextResponse.json(
        { error: "Invalid attendance endpoint or event not found" },
        { status: 404 }
      );
    }

    const endpoint = endpoints[0];
    console.log('Found endpoint:', endpoint);

    // Check if event is within attendance timeframe (2 hours before start until event end)
    const eventStart = new Date(endpoint.startDate);
    const eventEnd = new Date(endpoint.endDate);
    const twoHoursBeforeStart = new Date(eventStart.getTime() - 2 * 60 * 60 * 1000);

    console.log('Time check - now:', now, 'twoHoursBeforeStart:', twoHoursBeforeStart, 'eventEnd:', eventEnd);
    if (now < twoHoursBeforeStart || now > eventEnd) {
      console.log('Event not within timeframe');
      return NextResponse.json(
        { 
          error: "Attendance not available",
          message: `Attendance is only available from 2 hours before event start (${twoHoursBeforeStart.toLocaleString()}) until event end (${eventEnd.toLocaleString()})`
        },
        { status: 400 }
      );
    }

    console.log('Time validation passed - proceeding with manager lookup');
    
    // Check if the scanned code exists in attendanceManager using raw SQL
    console.log('Searching attendanceManager for hashcode:', hashcode, 'eventId:', parsedEventId);
    const managerResult = await prisma.$queryRaw`
      SELECT * 
      FROM attendanceManager 
      WHERE eventId = ${parsedEventId} AND hashcode = ${hashcode}
      LIMIT 1
    `;

    console.log('Manager query result:', managerResult);
    const managers = managerResult as any[];
    const managerRecord = managers.length > 0 ? managers[0] : null;
    console.log('Manager record found:', managerRecord);

    if (!managerRecord) {
      console.log('No manager record found, checking attendanceContestant table');
      // If not found in attendanceManager, check attendanceContestant
      const contestantResult = await prisma.$queryRaw`
        SELECT * 
        FROM attendanceContestant 
        WHERE eventId = ${parsedEventId} AND (hashcode = ${hashcode} OR ic = ${hashcode})
        LIMIT 1
      `;

      const contestants = contestantResult as any[];
      if (contestants.length === 0) {
        return NextResponse.json(
          { error: "Invalid QR code. Code not found in attendance records for this event." },
          { status: 404 }
        );
      }

      // Found in attendanceContestant but not attendanceManager
      return NextResponse.json(
        { error: "This QR code belongs to a contestant. Only manager codes can be used for bulk check-in." },
        { status: 400 }
      );
    }

    // Check if contingent is already checked in
    if (managerRecord.attendanceStatus === 'Present') {
      return NextResponse.json(
        { 
          error: "Already checked in",
          message: `This contingent has already been checked in at ${new Date(managerRecord.attendanceDate).toLocaleString()}`
        },
        { status: 400 }
      );
    }

    // Update all attendanceManager records for this contingent using raw SQL
    const managerUpdateResult = await prisma.$executeRaw`
      UPDATE attendanceManager 
      SET attendanceStatus = 'Present', 
          attendanceDate = ${now}, 
          attendanceTime = ${now}, 
          updatedAt = ${now}
      WHERE eventId = ${parsedEventId} AND contingentId = ${managerRecord.contingentId}
    `;

    // Update all attendanceContestant records for this contingent using raw SQL
    const contestantUpdateResult = await prisma.$executeRaw`
      UPDATE attendanceContestant 
      SET attendanceStatus = 'Present', 
          attendanceDate = ${now}, 
          attendanceTime = ${now}, 
          updatedAt = ${now}
      WHERE eventId = ${parsedEventId} AND contingentId = ${managerRecord.contingentId}
    `;

    // Get contingent details using raw SQL
    const contingentResult = await prisma.$queryRaw`
      SELECT c.name as contingentName, 
             c.logoUrl,
             s.name as schoolName, 
             hi.name as institutionName
      FROM contingent c
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
      WHERE c.id = ${managerRecord.contingentId}
      LIMIT 1
    `;

    const contingents = contingentResult as any[];
    const contingent = contingents.length > 0 ? contingents[0] : null;

    // Return success response with contingent details
    return NextResponse.json({
      success: true,
      message: `Check-in successful for ${contingent?.contingentName || 'Contingent'}`,
      contingent: {
        name: contingent?.contingentName || 'Unknown Contingent',
        logoUrl: contingent?.logoUrl || null,
        institution: contingent?.schoolName || contingent?.institutionName || 'Unknown Institution',
        checkedInAt: now,
        managersUpdated: Number(managerUpdateResult),
        contestantsUpdated: Number(contestantUpdateResult),
        totalUpdated: Number(managerUpdateResult) + Number(contestantUpdateResult)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: "Internal server error during check-in" },
      { status: 500 }
    );
  } finally {
    // Ensure database connection is properly closed
    try {
      await prisma.$disconnect();
      console.log('Database connection closed successfully');
    } catch (disconnectError) {
      console.error('Error closing database connection:', disconnectError);
    }
  }
}
