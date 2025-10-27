import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // Use consistent authentication approach
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log("Authentication failed: No session found");
      return new NextResponse(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    
    console.log("Session user:", session.user?.email);

    const { eventId } = params;
    if (!eventId || isNaN(parseInt(eventId))) {
      console.error("Invalid eventId parameter:", eventId);
      return new NextResponse(JSON.stringify({ error: "Invalid event ID" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const eventIdInt = parseInt(eventId);
    console.log(`Generating attendance download for eventId: ${eventIdInt}`);

    // First verify event exists
    const eventExists = await prisma.event.findUnique({
      where: { id: eventIdInt },
      select: { id: true }
    });

    if (!eventExists) {
      console.error(`Event with ID ${eventIdInt} not found`);
      return new NextResponse(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // Modified query to use safer JOIN structure and handle potential NULL values
    const query = `
      SELECT 
        COALESCE(ac.contestGroup, '') as Level,
        COALESCE(c.name, '') as Competition,
        COALESCE(s.name, '') as State,
        ect.teamPriority as Priority,
        COALESCE(t.name, '') as Team,
        CASE 
          WHEN cont.contingentType = 'SCHOOL' THEN COALESCE(sch.name, 'Unknown School')
          WHEN cont.contingentType = 'HIGHER_INSTITUTION' THEN COALESCE(hi.name, 'Unknown Institution')
          WHEN cont.contingentType = 'INDEPENDENT' THEN COALESCE(ind.name, 'Unknown Independent')
          ELSE 'Unknown'
        END as Contingent,
        COALESCE(con.name, '') as Name,
        CASE 
          WHEN LOWER(con.class_grade) = 'ppki' THEN con.class_grade
          WHEN con.edu_level = 'sekolah rendah' THEN CONCAT('Darjah ', COALESCE(con.class_grade, ''))
          WHEN con.edu_level = 'sekolah menengah' THEN CONCAT('Tingkatan ', COALESCE(con.class_grade, ''))
          ELSE CONCAT('Darjah/ Tingkatan ', COALESCE(con.class_grade, ''))
        END as Class,
        con.age as Age
      FROM attendanceContestant ac
      LEFT JOIN contestant con ON ac.contestantId = con.id
      LEFT JOIN contingent cont ON con.contingentId = cont.id
      LEFT JOIN school sch ON cont.schoolId = sch.id
      LEFT JOIN higherinstitution hi ON cont.higherInstId = hi.id
      LEFT JOIN independent ind ON cont.independentId = ind.id
      LEFT JOIN team t ON ac.teamId = t.id
      LEFT JOIN contest c ON t.contestId = c.id
      LEFT JOIN eventcontestteam ect ON (ac.teamId = ect.teamId)
      LEFT JOIN state s ON (
        CASE 
          WHEN cont.contingentType = 'SCHOOL' AND sch.stateId IS NOT NULL THEN sch.stateId
          WHEN cont.contingentType = 'HIGHER_INSTITUTION' AND hi.stateId IS NOT NULL THEN hi.stateId
          WHEN cont.contingentType = 'INDEPENDENT' AND ind.stateId IS NOT NULL THEN ind.stateId
          ELSE NULL
        END
      ) = s.id
      WHERE ac.eventId = ?
      ORDER BY ac.contestGroup, c.name, con.name
    `;

    try {
      console.log("Executing SQL query...");
      const contestants = await prisma.$queryRawUnsafe(query, eventIdInt) as any[];
      console.log(`Query returned ${contestants.length} contestants`);

      if (contestants.length === 0) {
        console.log("No attendance records found for this event");
        // Return empty file rather than error
      }

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(contestants);

      // Set column widths for better readability
      const columnWidths = [
        { wch: 10 }, // contestGroup
        { wch: 30 }, // contestName
        { wch: 15 }, // stateName
        { wch: 10 }, // teamPriority
        { wch: 20 }, // teamName
        { wch: 30 }, // contingentName
        { wch: 30 }, // name
        { wch: 15 }, // formattedClassGrade
        { wch: 5 }   // age
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance List');

      // Generate binary string from workbook
      console.log("Generating Excel buffer...");
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      console.log("Excel buffer generated successfully");

      // Create response with Excel file
      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename="attendance-list-event-${eventId}.xlsx"`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    } catch (sqlError) {
      console.error('SQL query execution error:', sqlError);
      return new NextResponse(JSON.stringify({ error: 'Database query failed', details: String(sqlError) }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  } catch (error) {
    console.error('Error generating attendance list:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Failed to generate attendance list', 
      details: String(error),
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
