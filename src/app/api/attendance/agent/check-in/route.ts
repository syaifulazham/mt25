import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Dynamic route export
export const dynamic = 'force-dynamic';

// POST handler for agent attendance check-in
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Agent check-in request body:', body);
    
    const { eventId, endpointhash, hashcode, method = 'QR_SCAN' } = body;

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

    // Validate the agent attendance endpoint exists using raw SQL
    console.log('Querying agent endpoint with eventId:', parsedEventId, 'endpointhash:', endpointhash);
    const endpointResult = await prisma.$queryRaw`
      SELECT ae.*, e.name, e.startDate, e.endDate 
      FROM attendanceagent_endpoint ae
      JOIN event e ON ae.eventId = e.id
      WHERE ae.eventId = ${parsedEventId} AND ae.endpointhash = ${endpointhash}
      LIMIT 1
    `;

    console.log('Agent endpoint query result:', endpointResult);
    const endpoints = endpointResult as any[];
    if (!endpoints || endpoints.length === 0) {
      console.log('No agent endpoint found');
      return NextResponse.json(
        { error: "Invalid agent attendance endpoint or event not found" },
        { status: 404 }
      );
    }

    const endpoint = endpoints[0];
    console.log('Found agent endpoint:', endpoint);

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
        console.log('No contestant found for hashcode/IC:', hashcode);
        return NextResponse.json(
          { error: "Participant not found for this event" },
          { status: 404 }
        );
      }

      const contestantRecord = contestants[0];
      console.log('Found contestant record:', contestantRecord);

      // Check if already marked as present
      if (contestantRecord.attendanceStatus === 'Present') {
        console.log('Contestant already marked as present');
        return NextResponse.json(
          { error: "Participant already marked as present" },
          { status: 400 }
        );
      }

      // Update contestant attendance status
      console.log('Updating contestant attendance status to Present');
      await prisma.$executeRaw`
        UPDATE attendanceContestant 
        SET attendanceStatus = 'Present', checkInTime = ${now} 
        WHERE eventId = ${parsedEventId} AND id = ${contestantRecord.id}
      `;

      // Insert attendance log for contestant
      console.log('Inserting attendance log for contestant');
      await prisma.$executeRaw`
        INSERT INTO attendanceLog (eventId, participantType, participantId, checkInTime, method, endpointHash, createdAt) 
        VALUES (${parsedEventId}, 'contestant', ${contestantRecord.id}, ${now}, ${method}, ${endpointhash}, ${now})
      `;

      // Get contingent info for response
      const contingentResult = await prisma.$queryRaw`
        SELECT c.name as contingentName, c.logo as contingentLogo, hi.name as higherInstName
        FROM contingent c
        LEFT JOIN higherInst hi ON c.higherInstId = hi.id
        WHERE c.id = ${contestantRecord.contingentId}
        LIMIT 1
      `;

      const contingents = contingentResult as any[];
      const contingent = contingents.length > 0 ? contingents[0] : null;

      // Get team info for response
      const teamResult = await prisma.$queryRaw`
        SELECT t.name as teamName
        FROM team t
        WHERE t.id = ${contestantRecord.teamId}
        LIMIT 1
      `;

      const teams = teamResult as any[];
      const team = teams.length > 0 ? teams[0] : null;

      console.log('Agent check-in successful for contestant:', contestantRecord.name);
      return NextResponse.json({
        success: true,
        message: "Check-in successful",
        participant: {
          name: contestantRecord.name,
          ic: contestantRecord.ic,
          contingent: contingent?.contingentName || 'Unknown',
          team: team?.teamName || 'No Team',
          contingentLogo: contingent?.contingentLogo || null
        }
      });
    }

    // Process manager record
    console.log('Processing manager record');
    
    // Check if manager already marked as present
    if (managerRecord.attendanceStatus === 'Present') {
      console.log('Manager already marked as present');
      return NextResponse.json(
        { error: "Participant already marked as present" },
        { status: 400 }
      );
    }

    // Update manager attendance status
    console.log('Updating manager attendance status to Present');
    await prisma.$executeRaw`
      UPDATE attendanceManager 
      SET attendanceStatus = 'Present', checkInTime = ${now} 
      WHERE eventId = ${parsedEventId} AND id = ${managerRecord.id}
    `;

    // Also update all contestants from the same contingent
    console.log('Updating all contestants from contingent:', managerRecord.contingentId);
    await prisma.$executeRaw`
      UPDATE attendanceContestant 
      SET attendanceStatus = 'Present', checkInTime = ${now} 
      WHERE eventId = ${parsedEventId} AND contingentId = ${managerRecord.contingentId} AND attendanceStatus != 'Present'
    `;

    // Insert attendance log for manager
    console.log('Inserting attendance log for manager');
    await prisma.$executeRaw`
      INSERT INTO attendanceLog (eventId, participantType, participantId, checkInTime, method, endpointHash, createdAt) 
      VALUES (${parsedEventId}, 'manager', ${managerRecord.id}, ${now}, ${method}, ${endpointhash}, ${now})
    `;

    // Get contingent info for response
    const contingentResult = await prisma.$queryRaw`
      SELECT c.name as contingentName, c.logo as contingentLogo, hi.name as higherInstName
      FROM contingent c
      LEFT JOIN higherInst hi ON c.higherInstId = hi.id
      WHERE c.id = ${managerRecord.contingentId}
      LIMIT 1
    `;

    const contingents = contingentResult as any[];
    const contingent = contingents.length > 0 ? contingents[0] : null;

    console.log('Agent check-in successful for manager:', managerRecord.name);
    return NextResponse.json({
      success: true,
      message: "Check-in successful (Manager - All team members marked present)",
      participant: {
        name: managerRecord.name,
        ic: managerRecord.ic,
        contingent: contingent?.contingentName || 'Unknown',
        team: 'Manager',
        contingentLogo: contingent?.contingentLogo || null
      }
    });

  } catch (error) {
    console.error("Error processing agent check-in:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
