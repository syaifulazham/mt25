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

    // Check if event is within attendance timeframe (3 hours before start until event end) - Malaysia timezone
    const eventStart = new Date(endpoint.startDate);
    const eventEnd = new Date(endpoint.endDate);
    const threeHoursBeforeStart = new Date(eventStart.getTime() - 3 * 60 * 60 * 1000);

    // Format times in Malaysia timezone for display
    const malaysiaTimeOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };

    console.log('Time check - now:', now, 'threeHoursBeforeStart:', threeHoursBeforeStart, 'eventEnd:', eventEnd);
    if (now < threeHoursBeforeStart || now > eventEnd) {
      console.log('Event not within timeframe');
      return NextResponse.json(
        { 
          error: "Attendance not available",
          message: `Attendance is only available from 3 hours before event start (${threeHoursBeforeStart.toLocaleString('en-MY', malaysiaTimeOptions)}) until event end (${eventEnd.toLocaleString('en-MY', malaysiaTimeOptions)})`
        },
        { status: 400 }
      );
    }

    console.log('Time validation passed - proceeding with hashcode lookup');
    
    let contingentId: number | null = null;
    let lookupSource = '';
    
    // First, check if the scanned code exists in attendanceManager using raw SQL
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
    
    if (managerRecord) {
      contingentId = managerRecord.contingentId;
      lookupSource = 'attendanceManager';
      console.log('Found in attendanceManager, contingentId:', contingentId);
    } else {
      console.log('No manager record found, checking attendanceContingent table');
      // Check attendanceContingent for the hashcode
      const contingentResult = await prisma.$queryRaw`
        SELECT * 
        FROM attendanceContingent 
        WHERE hashcode = ${hashcode}
        LIMIT 1
      `;

      const contingents = contingentResult as any[];
      const contingentRecord = contingents.length > 0 ? contingents[0] : null;
      
      if (contingentRecord) {
        contingentId = contingentRecord.contingentId;
        lookupSource = 'attendanceContingent';
        console.log('Found in attendanceContingent, contingentId:', contingentId);
      } else {
        console.log('No contingent record found, checking attendanceContestant table');
        // If not found in attendanceManager or attendanceContingent, check attendanceContestant
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

        // Found in attendanceContestant but not attendanceManager or attendanceContingent
        return NextResponse.json(
          { error: "This QR code belongs to a contestant. Only manager or contingent codes can be used for bulk check-in." },
          { status: 400 }
        );
      }
    }

    if (!contingentId) {
      return NextResponse.json(
        { error: "Unable to determine contingent for this hashcode." },
        { status: 400 }
      );
    }

    // Check if contingent is already checked in by looking at any manager record for this contingent
    const existingAttendanceResult = await prisma.$queryRaw`
      SELECT attendanceStatus, attendanceDate, contingentId
      FROM attendanceManager 
      WHERE eventId = ${parsedEventId} AND contingentId = ${contingentId} AND attendanceStatus = 'Present'
      LIMIT 1
    `;
    
    const existingAttendance = existingAttendanceResult as any[];
    const alreadyCheckedIn = existingAttendance.length > 0;
    
    if (alreadyCheckedIn) {
      console.log('Contingent already checked in, returning contingent details');
      const existingRecord = existingAttendance[0];
      
      // Get contingent details for the already checked-in contingent
      const contingentResult = await prisma.$queryRaw`
        SELECT c.name as contingentName, 
               c.logoUrl,
               s.name as schoolName, 
               hi.name as institutionName
        FROM contingent c
        LEFT JOIN school s ON c.schoolId = s.id
        LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
        WHERE c.id = ${contingentId}
        LIMIT 1
      `;

      const contingents = contingentResult as any[];
      const contingent = contingents.length > 0 ? contingents[0] : null;
      
      // Format the existing check-in time in Malaysia timezone
      const malaysiaTimeOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      
      return NextResponse.json({
        success: true,
        message: `Already checked in at ${new Date(existingRecord.attendanceDate).toLocaleString('en-MY', malaysiaTimeOptions)}`,
        contingent: {
          name: contingent?.contingentName || 'Unknown Contingent',
          logoUrl: contingent?.logoUrl || null,
          institution: contingent?.schoolName || contingent?.institutionName || 'Unknown Institution',
          checkedInAt: existingRecord.attendanceDate,
          alreadyPresent: true
        }
      }, { status: 200 });
    }

    // Update all attendanceManager records for this contingent using raw SQL
    console.log(`Updating attendanceManager records for contingentId: ${contingentId}, found via: ${lookupSource}`);
    const managerUpdateResult = await prisma.$executeRaw`
      UPDATE attendanceManager 
      SET attendanceStatus = 'Present', 
          attendanceDate = ${now}, 
          attendanceTime = ${now}, 
          updatedAt = ${now}
      WHERE eventId = ${parsedEventId} AND contingentId = ${contingentId}
    `;

    // Update all attendanceContestant records for this contingent using raw SQL
    console.log(`Updating attendanceContestant records for contingentId: ${contingentId}`);
    const contestantUpdateResult = await prisma.$executeRaw`
      UPDATE attendanceContestant 
      SET attendanceStatus = 'Present', 
          attendanceDate = ${now}, 
          attendanceTime = ${now}, 
          updatedAt = ${now}
      WHERE eventId = ${parsedEventId} AND contingentId = ${contingentId}
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
      WHERE c.id = ${contingentId}
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
        lookupSource: lookupSource,
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
