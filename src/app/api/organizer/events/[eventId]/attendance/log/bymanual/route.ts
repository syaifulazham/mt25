import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Helper function to serialize BigInt values to strings
function serializeBigInt(data: any): any {
  return JSON.parse(JSON.stringify(data, (_, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }));
};

// Define attendance record type to match SQL query result structure
type AttendanceRecord = {
  category: 'Participant' | 'Manager';
  eventId: number;
  name: string;
  ic: string | null;
  hashcode: string;
  stateId: number | null;
  contingentId: number;
  teamId: number;
  state: string | null;
  contingentName: string;
  teamName: string;
  contingentType: string;
  attendanceStatus: 'Present' | 'Not Present';
  contestId: string | number;
  contestCode: string | null;
  contestName: string | null;
  attendanceNote: string | null;
  attendanceDate: string | null;
  recordId: number;
};

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // Authenticate the request
    const session = await getServerSession(authOptions);
    
    // Check if user is logged in and has the appropriate role
    if (!session || !(session.user.role === 'ADMIN' || session.user.role === 'OPERATOR')) {
      return new NextResponse(JSON.stringify({
        error: 'Unauthorized. Only admins and operators can view attendance logs.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const eventId = parseInt(params.eventId);
    
    if (isNaN(eventId)) {
      return new NextResponse(JSON.stringify({
        error: 'Invalid event ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse filter parameters
    const searchParams = request.nextUrl.searchParams;
    const stateId = searchParams.get('stateId');
    const contestGroup = searchParams.get('contestGroup');
    const category = searchParams.get('category'); // Add category filter parameter

    // Get attendance data for contestants with all required fields
    let contestantQuery = `
      SELECT 
        'Participant' as category,
        ac.eventId,
        con.name,
        con.ic,
        ac.hashcode,
        ac.stateId,
        ac.contingentId,
        ac.teamId,
        ac.state,
        ac.contestGroup,
        CASE 
          WHEN c.contingentType = 'SCHOOL' THEN s.name
          WHEN c.contingentType = 'INDEPENDENT' THEN i.name
          ELSE 'Unknown'
        END as contingentName,
        t.name as teamName,
        c.contingentType,
        ac.attendanceStatus,
        ac.contestId,
        ct.code as contestCode,
        ct.name as contestName,
        ac.attendanceNote,
        ac.attendanceDate,
        ac.id as recordId
      FROM attendanceContestant ac
      JOIN contestant con ON ac.contestantId = con.id
      JOIN contingent c ON ac.contingentId = c.id
      JOIN team t ON ac.teamId = t.id
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN independent i ON c.independentId = i.id
      LEFT JOIN contest ct ON ac.contestId = ct.id
      WHERE ac.eventId = ${eventId}
    `;

    // Add stateId filter if provided
    if (stateId) {
      contestantQuery += ` AND ac.stateId = ${parseInt(stateId)}`;
    }

    // Add contestGroup filter if provided
    if (contestGroup) {
      contestantQuery += ` AND ct.contestGroup = '${contestGroup}'`;
    }

    const contestantAttendance = await prisma.$queryRawUnsafe(contestantQuery);
    
    // Get distinct states for this event - using left joins to avoid null records
    let distinctStates: Array<{ id: number, name: string }> = [];
    try {
      const distinctStatesQuery = `
        SELECT DISTINCT 
          s.id as id, 
          s.name as name
        FROM attendanceContestant ac
        LEFT JOIN state s ON ac.stateId = s.id
        WHERE ac.eventId = ${eventId} AND s.id IS NOT NULL
        ORDER BY s.name ASC
      `;
      
      const result = await prisma.$queryRawUnsafe(distinctStatesQuery);
      distinctStates = result as Array<{ id: number, name: string }>;
    } catch (error) {
      console.error('Error fetching distinct states:', error);
      distinctStates = []; // Default to empty array if query fails
    }
    
    // Get distinct contest groups for this event - using safer query with error handling
    let distinctContestGroups: Array<{ value: string }> = [];
    try {
      // Filter by category if specified
      const distinctContestGroupsQuery = `
        SELECT DISTINCT 
          ac.contestGroup as value
        FROM attendanceContestant ac
        WHERE ac.eventId = ${eventId} AND ac.contestGroup IS NOT NULL
        ORDER BY ac.contestGroup ASC
      `;
      
      const result = await prisma.$queryRawUnsafe(distinctContestGroupsQuery);
      distinctContestGroups = result as Array<{ value: string }>;
    } catch (error) {
      console.error('Error fetching distinct contest groups:', error);
      distinctContestGroups = []; // Default to empty array if query fails
    }

    // Get attendance data for managers with all required fields
    // Manager's teamId is always 0, and we group concat team names
    let managerQuery = `
      SELECT 
        'Manager' as category,
        am.eventId,
        m.name,
        m.ic,
        am.hashcode,
        am.stateId,
        am.contingentId,
        0 as teamId,
        am.state,
        am.contestGroup,
        CASE 
          WHEN c.contingentType = 'SCHOOL' THEN s.name
          WHEN c.contingentType = 'INDEPENDENT' THEN i.name
          ELSE 'Unknown'
        END as contingentName,
        GROUP_CONCAT(DISTINCT t.name SEPARATOR ', ') as teamName,
        c.contingentType,
        am.attendanceStatus,
        '' as contestId,
        '' as contestCode,
        '' as contestName,
        am.attendanceNote,
        am.attendanceDate,
        am.id as recordId
      FROM attendanceManager am
      JOIN manager m ON am.managerId = m.id
      JOIN contingent c ON am.contingentId = c.id
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN independent i ON c.independentId = i.id
      LEFT JOIN manager_team mt ON mt.managerId = m.id
      LEFT JOIN team t ON mt.teamId = t.id
      WHERE am.eventId = ${eventId}
    `;

    // Add stateId filter if provided
    if (stateId) {
      managerQuery += ` AND am.stateId = ${parseInt(stateId)}`;
    }

    // Group by manager ID is needed for the GROUP_CONCAT
    managerQuery += ` GROUP BY am.id`;
    
    const managerAttendance = await prisma.$queryRawUnsafe(managerQuery);

    try {
      // Combine both datasets with proper typing and serialize BigInt values
      const contestantRecords = serializeBigInt(contestantAttendance) as AttendanceRecord[];
      const managerRecords = serializeBigInt(managerAttendance) as AttendanceRecord[];
      const serializedStates = serializeBigInt(distinctStates);
      const serializedContestGroups = serializeBigInt(distinctContestGroups);
      
      // Combine data based on category filter if specified
      let attendanceData: AttendanceRecord[];
      if (category === 'Participant') {
        attendanceData = contestantRecords;
      } else if (category === 'Manager') {
        attendanceData = managerRecords;
      } else {
        attendanceData = [...contestantRecords, ...managerRecords];
      }
      
      return NextResponse.json({
        attendanceData,
        filterOptions: {
          states: serializedStates,
          contestGroups: serializedContestGroups,
          categories: [
            { value: 'all', label: 'All' },
            { value: 'Participant', label: 'Participant' },
            { value: 'Manager', label: 'Manager' }
          ]
        }
      });
    } catch (serializeError) {
      console.error('Error serializing response data:', serializeError);
      return NextResponse.json({ error: 'Error processing attendance data' }, { status: 500 });
    }
  
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    return new NextResponse(JSON.stringify({
      error: `Failed to fetch attendance data: ${error instanceof Error ? error.message : 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Update attendance status (mark present/reset to not present)
export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // Authenticate the request
    const session = await getServerSession(authOptions);
    
    // Check if user is logged in and has the appropriate role
    if (!session || !(session.user.role === 'ADMIN' || session.user.role === 'OPERATOR')) {
      return new NextResponse(JSON.stringify({
        error: 'Unauthorized. Only admins and operators can update attendance.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const eventId = parseInt(params.eventId);
    
    if (isNaN(eventId)) {
      return new NextResponse(JSON.stringify({
        error: 'Invalid event ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const { recordId, category, status, attendanceNote, contingentId } = body;

    if (!recordId || !category || (!status && attendanceNote === undefined)) {
      return new NextResponse(JSON.stringify({
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    let result;

    // Update the appropriate table based on category
    if (category === 'Participant') {
      // Handle attendance status update for contestants
      if (status !== undefined) {
        if (status === 'Present') {
          // First, get the contestant record to get the contingentId, eventId and teamId
          const contestantRecord = await prisma.$queryRaw`
            SELECT id, contestantId, contingentId, eventId, teamId
            FROM attendanceContestant
            WHERE id = ${recordId}
          `;
          
          console.log('Contestant record:', contestantRecord);
          
          if (Array.isArray(contestantRecord) && contestantRecord.length > 0) {
            const { contestantId, contingentId, eventId, teamId } = contestantRecord[0] as any;
            
            // Log the current status before updating
            console.log(`Attempting to update attendanceContestant record ID ${recordId} to Present`);
            const currentStatus = await prisma.$queryRaw`
              SELECT id, attendanceStatus FROM attendanceContestant WHERE id = ${recordId}
            `;
            console.log('Current status before update:', currentStatus);
            
            // Update the contestant record
            try {
              result = await prisma.$queryRaw`
                UPDATE attendanceContestant
                SET 
                  attendanceStatus = 'Present',
                  attendanceDate = ${now},
                  updatedAt = ${now}
                WHERE id = ${recordId}
              `;
              console.log('Update result for contestant:', result);
              
              // Check if the update was successful by querying again
              const afterUpdate = await prisma.$queryRaw`
                SELECT id, attendanceStatus FROM attendanceContestant WHERE id = ${recordId}
              `;
              console.log('Status after update:', afterUpdate);
            } catch (error) {
              console.error('Error updating contestant status:', error);
            }
            console.log('Update attendanceContestant result:', result);
            
            // Update or create the attendanceTeam record
            if (teamId) {
              console.log(`Checking team attendance for teamId=${teamId}, eventId=${eventId}`);
              const teamRecord = await prisma.$queryRaw`
                SELECT id, teamId, eventId, attendanceStatus
                FROM attendanceTeam
                WHERE teamId = ${teamId} AND eventId = ${eventId}
              `;
              
              console.log('Team record:', teamRecord);
              
              if (Array.isArray(teamRecord) && teamRecord.length > 0) {
                // Update existing team record
                await prisma.$queryRaw`
                  UPDATE attendanceTeam
                  SET
                    attendanceStatus = 'Present',
                    attendanceDate = ${now},
                    updatedAt = ${now}
                  WHERE teamId = ${teamId} AND eventId = ${eventId}
                `;
                console.log(`Updated attendanceTeam for teamId=${teamId}`);
              } else {
                // Create new team record if needed
                const teamHashcode = `team-${teamId}-${eventId}-${Date.now()}`;
                await prisma.$queryRaw`
                  INSERT INTO attendanceTeam (
                    hashcode, teamId, contingentId, eventId, attendanceStatus,
                    attendanceDate, attendanceTime, createdAt, updatedAt
                  ) VALUES (
                    ${teamHashcode}, ${teamId}, ${contingentId}, ${eventId}, 'Present',
                    ${now}, ${now}, ${now}, ${now}
                  )
                `;
                console.log(`Created new attendanceTeam for teamId=${teamId}`);
              }
            }
          } else {
            console.error(`No attendanceContestant record found for recordId=${recordId}`);
          }
        } else {
          // When marking as Not Present, only update the status, not the date
          result = await prisma.$queryRaw`
            UPDATE attendanceContestant
            SET 
              attendanceStatus = 'Not Present',
              updatedAt = ${now}
            WHERE id = ${recordId}
          `;
        }
      } 
      // Handle notes update for contestants
      else if (attendanceNote !== undefined) {
        result = await prisma.$queryRaw`
          UPDATE attendanceContestant
          SET 
            attendanceNote = ${attendanceNote},
            updatedAt = ${now}
          WHERE id = ${recordId}
        `;
      }
    } else if (category === 'Manager') {
      // Handle attendance status update for managers
      if (status !== undefined) {
        // Special handling for managers - if marking present and contingentId is provided,
        // mark all managers in the same contingent as present AND update the contingent attendance
        if (status === 'Present' && contingentId) {
          // First, update all managers in this contingent
          result = await prisma.$queryRaw`
            UPDATE attendanceManager
            SET 
              attendanceStatus = 'Present',
              attendanceDate = ${now},
              updatedAt = ${now}
            WHERE contingentId = ${contingentId} AND eventId = ${eventId}
          `;
          
          // Second, also update the attendanceContingent record for this contingent
          console.log(`Attempting to update attendanceContingent for contingentId=${contingentId}, eventId=${eventId}`);
          
          // Check if record exists first
          const contingentRecord = await prisma.$queryRaw`
            SELECT id, contingentId, eventId, attendanceStatus 
            FROM attendanceContingent 
            WHERE contingentId = ${contingentId} AND eventId = ${eventId}
          `;
          
          console.log('Existing contingent record:', contingentRecord);
          
          if (Array.isArray(contingentRecord) && contingentRecord.length > 0) {
            // Record exists, update it
            const updateResult = await prisma.$queryRaw`
              UPDATE attendanceContingent
              SET 
                attendanceStatus = 'Present',
                attendanceDate = ${now},
                updatedAt = ${now}
              WHERE contingentId = ${contingentId} AND eventId = ${eventId}
            `;
            console.log('Update result:', updateResult);
          } else {
            // No record exists, create one
            console.log('No attendanceContingent record found, creating one');
            const hashcode = `cont-${contingentId}-${eventId}-${Date.now()}`;
            const insertResult = await prisma.$queryRaw`
              INSERT INTO attendanceContingent (
                hashcode, contingentId, eventId, attendanceStatus,
                attendanceDate, attendanceTime, createdAt, updatedAt
              ) VALUES (
                ${hashcode}, ${contingentId}, ${eventId}, 'Present',
                ${now}, ${now}, ${now}, ${now}
              )
            `;
            console.log('Insert result:', insertResult);
          }
          
          // Third, mark all contestants in the same contingent as Present
          console.log(`Marking all contestants in contingentId=${contingentId} for eventId=${eventId} as Present`);
          
          // Update all contestant records for this contingent
          try {
            const contestantsUpdateResult = await prisma.$queryRaw`
              UPDATE attendanceContestant
              SET 
                attendanceStatus = 'Present',
                attendanceDate = ${now},
                updatedAt = ${now}
              WHERE contingentId = ${contingentId} AND eventId = ${eventId}
            `;
            console.log('Contestants update result:', contestantsUpdateResult);
            
            // Count how many contestants were affected
            const contestantCount = await prisma.$queryRaw<{ count: bigint }[]>`
              SELECT COUNT(*) as count FROM attendanceContestant 
              WHERE contingentId = ${contingentId} AND eventId = ${eventId}
            `;
            console.log(`Updated ${contestantCount[0]?.count.toString() || 0} contestant records for contingentId=${contingentId}`);
          } catch (error) {
            console.error('Error updating contestants status:', error);
          }
        } else {
          // Regular single-record update for manager (reset or no contingentId provided)
          if (status === 'Present') {
            result = await prisma.$queryRaw`
              UPDATE attendanceManager
              SET 
                attendanceStatus = 'Present',
                attendanceDate = ${now},
                updatedAt = ${now}
              WHERE id = ${recordId}
            `;
          } else {
            // When marking as Not Present, only update the status, not the date
            result = await prisma.$queryRaw`
              UPDATE attendanceManager
              SET 
                attendanceStatus = 'Not Present',
                updatedAt = ${now}
              WHERE id = ${recordId}
            `;
          }
        }
      } 
      // Handle notes update for managers
      else if (attendanceNote !== undefined) {
        result = await prisma.$queryRaw`
          UPDATE attendanceManager
          SET 
            attendanceNote = ${attendanceNote},
            updatedAt = ${now}
          WHERE id = ${recordId}
        `;
      }
    } else {
      return new NextResponse(JSON.stringify({
        error: 'Invalid category'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new NextResponse(JSON.stringify({
      success: true,
      message: attendanceNote !== undefined ? 'Attendance note updated' : 'Attendance status updated',
      data: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  
  } catch (error: any) {
    console.error('Error updating attendance:', error);
    
    return NextResponse.json({
      error: error.message || 'Failed to update attendance data'
    }, { status: 500 });
  }
}
