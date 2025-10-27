import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// API to record attendance by QR code or manually
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Check for endpoint hash authentication
    if (body.endpointhash) {
      // Public access via endpoint hash
      // Verify the endpoint exists for this event
      const endpoint = await prisma.$queryRaw`
        SELECT * FROM "attendanceEndpoint"
        WHERE "eventId" = ${eventId} 
        AND "endpointhash" = ${body.endpointhash}
        LIMIT 1
      `;
      
      // Check if endpoint was found (will be array with at least one item)
      if (!endpoint || !Array.isArray(endpoint) || endpoint.length === 0) {
        return NextResponse.json(
          { error: 'Invalid endpoint or unauthorized' },
          { status: 401 }
        );
      }
      
      // Endpoint hash is valid, allow the operation
    } else {
      // Standard authentication check for organizer/admin
      const session = await getServerSession(authOptions);
      
      if (!session) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      const { role } = session.user;
      if (!['ADMIN', 'OPERATOR'].includes(role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }
    
    // Handle different methods of recording attendance
    if (body.method === 'qrcode') {
      return await handleQRCodeAttendance(eventId, body);
    } else if (body.method === 'manual') {
      return await handleManualAttendance(eventId, body);
    } else {
      return NextResponse.json(
        { error: 'Invalid attendance method' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error recording attendance:', error);
    return NextResponse.json(
      { error: 'Failed to record attendance' },
      { status: 500 }
    );
  }
}

// Handle attendance recorded via QR code
async function handleQRCodeAttendance(eventId: number, body: any) {
  const { hashcode } = body;
  
  if (!hashcode) {
    return NextResponse.json(
      { error: 'Hashcode is required' },
      { status: 400 }
    );
  }

  try {
    // Find contingent by hashcode
    const contingentAttendance = await prisma.$queryRaw`
      SELECT * FROM "attendanceContingent"
      WHERE "hashcode" = ${hashcode}
      LIMIT 1
    `;
    
    // Check if contingentAttendance was found (will be array with one item)
    if (!contingentAttendance || !Array.isArray(contingentAttendance) || contingentAttendance.length === 0) {
      return NextResponse.json(
        { error: 'Invalid QR code' },
        { status: 404 }
      );
    }
    
    const attendanceRecord: any = contingentAttendance[0];

    // Verify this contingent belongs to the specified event
    if (attendanceRecord.eventId !== eventId) {
      return NextResponse.json(
        { error: 'QR code does not match this event' },
        { status: 400 }
      );
    }

    const contingentId = attendanceRecord.contingentId;

    // Get contingent details
    const contingent = await prisma.$queryRaw`
      SELECT name FROM "contingent"
      WHERE id = ${contingentId}
      LIMIT 1
    `;
    
    if (!contingent || !Array.isArray(contingent) || contingent.length === 0) {
      return NextResponse.json(
        { error: 'Contingent not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    
    // Update attendance records using raw SQL
    await Promise.all([
      // Update contingent attendance
      prisma.$executeRaw`
        UPDATE "attendanceContingent"
        SET "attendanceStatus" = 'Present',
            "attendanceDate" = ${now},
            "attendanceTime" = ${now},
            "updatedAt" = ${now}
        WHERE "hashcode" = ${hashcode}
      `,
      
      // Update team attendance for this contingent
      prisma.$executeRaw`
        UPDATE "attendanceTeam"
        SET "attendanceStatus" = 'Present',
            "attendanceDate" = ${now},
            "attendanceTime" = ${now},
            "updatedAt" = ${now}
        WHERE "contingentId" = ${contingentId}
        AND "eventId" = ${eventId}
      `,
      
      // Update contestant attendance for this contingent
      prisma.$executeRaw`
        UPDATE "attendanceContestant"
        SET "attendanceStatus" = 'Present',
            "attendanceDate" = ${now},
            "attendanceTime" = ${now},
            "updatedAt" = ${now}
        WHERE "contingentId" = ${contingentId}
        AND "eventId" = ${eventId}
      `
    ]);

    // Return success response with contingent name
    if (Array.isArray(contingent) && contingent.length > 0 && contingent[0]) {
      return NextResponse.json({
        success: true,
        contingentName: (contingent[0] as any).name,
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Attendance recorded successfully'
    });
    
  } catch (error) {
    console.error('Error processing QR code attendance:', error);
    return NextResponse.json(
      { error: 'Failed to process attendance' },
      { status: 500 }
    );
  }


}

// Handle attendance recorded manually
async function handleManualAttendance(eventId: number, body: any) {
  const { contingentId, date, time } = body;
  
  if (!contingentId || !date || !time) {
    return NextResponse.json(
      { error: 'Contingent ID, date and time are required' },
      { status: 400 }
    );
  }

  try {
    // Parse contingent ID as number
    const parsedContingentId = parseInt(contingentId);
    if (isNaN(parsedContingentId)) {
      return NextResponse.json(
        { error: 'Invalid contingent ID format' },
        { status: 400 }
      );
    }
    
    // Check contingent exists
    const contingent = await prisma.$queryRaw`
      SELECT * FROM "contingent"
      WHERE id = ${parsedContingentId}
      LIMIT 1
    `;
    
    if (!contingent || !Array.isArray(contingent) || contingent.length === 0) {
      return NextResponse.json(
        { error: 'Contingent not found' },
        { status: 404 }
      );
    }

    const now = new Date();

    // Find existing attendance record
    const existingRecord = await prisma.$queryRaw`
      SELECT * FROM "attendanceContingent"
      WHERE "contingentId" = ${parsedContingentId}
      AND "eventId" = ${eventId}
      LIMIT 1
    `;
    
    const recordExists = existingRecord && Array.isArray(existingRecord) && existingRecord.length > 0;

    if (recordExists) {
      // Update existing attendance records
      await Promise.all([
        // Update contingent attendance
        prisma.$executeRaw`
          UPDATE "attendanceContingent"
          SET "attendanceStatus" = 'Present',
              "attendanceDate" = ${date}::date,
              "attendanceTime" = ${time}::time,
              "updatedAt" = ${now}
          WHERE id = ${(existingRecord[0] as any).id}
        `,
        
        // Update team attendance
        prisma.$executeRaw`
          UPDATE "attendanceTeam"
          SET "attendanceStatus" = 'Present',
              "attendanceDate" = ${date}::date,
              "attendanceTime" = ${time}::time,
              "updatedAt" = ${now}
          WHERE "contingentId" = ${parsedContingentId}
          AND "eventId" = ${eventId}
        `,
        
        // Update contestant attendance
        prisma.$executeRaw`
          UPDATE "attendanceContestant"
          SET "attendanceStatus" = 'Present',
              "attendanceDate" = ${date}::date,
              "attendanceTime" = ${time}::time,
              "updatedAt" = ${now}
          WHERE "contingentId" = ${parsedContingentId}
          AND "eventId" = ${eventId}
        `
      ]);
    } else {
      // Generate a new hashcode for this contingent
      const hashcode = `${eventId}-${parsedContingentId}-${Date.now()}`;
      
      // Create new attendance records
      await Promise.all([
        // Create contingent attendance
        prisma.$executeRaw`
          INSERT INTO "attendanceContingent" (
            "hashcode", "contingentId", "eventId", 
            "attendanceDate", "attendanceTime", "attendanceStatus", 
            "createdAt", "updatedAt"
          ) VALUES (
            ${hashcode}, ${parsedContingentId}, ${eventId}, 
            ${date}::date, ${time}::time, 'Present', 
            ${now}, ${now}
          )
        `,
        
        // Create team attendance records
        prisma.$executeRaw`
          INSERT INTO "attendanceTeam" (
            "contingentId", "teamId", "eventId", 
            "attendanceDate", "attendanceTime", "attendanceStatus", 
            "createdAt", "updatedAt"
          )
          SELECT 
            ${parsedContingentId}, "id", ${eventId}, 
            ${date}::date, ${time}::time, 'Present', 
            ${now}, ${now}
          FROM "team"
          WHERE "contingentId" = ${parsedContingentId}
        `,
        
        // Create contestant attendance records
        prisma.$executeRaw`
          INSERT INTO "attendanceContestant" (
            "contingentId", "contestantId", "eventId", 
            "attendanceDate", "attendanceTime", "attendanceStatus", 
            "createdAt", "updatedAt"
          )
          SELECT 
            ${parsedContingentId}, "id", ${eventId}, 
            ${date}::date, ${time}::time, 'Present', 
            ${now}, ${now}
          FROM "contestant"
          WHERE "contingentId" = ${parsedContingentId}
        `
      ]);
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance recorded successfully',
      contingentName: (contingent[0] as any).name,
    });
  } catch (error) {
    console.error('Error processing manual attendance:', error);
    return NextResponse.json(
      { error: 'Failed to record attendance' },
      { status: 500 }
    );
  }
}
