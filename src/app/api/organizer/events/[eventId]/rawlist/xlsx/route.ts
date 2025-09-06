import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from 'xlsx';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["ADMIN", "OPERATOR"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { name: true }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    console.log(`Fetching rawlist data for event ID: ${eventId}`);
    
    // First fetch the unique team records to avoid duplication
    const uniqueTeams = await prisma.$queryRaw`
      SELECT DISTINCT
        t.id,
        t.name as teamName,
        t.team_email as teamEmail,
        ct.name as contestName,
        ct.code as contestCode,
        ct.id as contestId,
        ect.status,
        ect.createdAt as registrationDate,
        CASE 
          WHEN c.contingentType = 'SCHOOL' THEN s.name
          WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN hi.name
          WHEN c.contingentType = 'INDEPENDENT' THEN i.name
          ELSE 'Unknown'
        END as contingentName,
        c.contingentType as contingentType,
        CASE 
          WHEN c.contingentType = 'SCHOOL' THEN st_s.name
          WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN st_hi.name
          WHEN c.contingentType = 'INDEPENDENT' THEN st_i.name
          ELSE 'Unknown State'
        END as stateName,
        st_s.name as schoolStateName,
        st_hi.name as hiStateName,
        st_i.name as indStateName,
        c.name as contingentNameRaw
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      JOIN contingent c ON t.contingentId = c.id
      JOIN contest ct ON ec.contestId = ct.id
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
      LEFT JOIN independent i ON c.independentId = i.id
      LEFT JOIN state st_s ON s.stateId = st_s.id
      LEFT JOIN state st_hi ON hi.stateId = st_hi.id
      LEFT JOIN state st_i ON i.stateId = st_i.id
      WHERE ec.eventId = ${eventId}
      ORDER BY ct.name, t.name ASC
    ` as any[];
    
    // Now fetch target group info for each unique team/contest combination
    const teams = await Promise.all(
      uniqueTeams.map(async (team) => {
        const targetGroups = await prisma.$queryRaw`
          SELECT 
            tg.schoolLevel,
            CASE 
              WHEN tg.schoolLevel = 'Primary' THEN 'Kids'
              WHEN tg.schoolLevel = 'Secondary' THEN 'Teens'
              WHEN tg.schoolLevel = 'Higher Education' THEN 'Youth'
              ELSE tg.schoolLevel
            END as targetGroupLabel,
            tg.minAge,
            tg.maxAge
          FROM _contesttotargetgroup ctg 
          JOIN targetgroup tg ON tg.id = ctg.B
          WHERE ctg.A = ${team.contestId}
          ORDER BY tg.minAge ASC
        ` as any[];
        
        // Get the combined age range across all target groups
        let minAge = Number.MAX_SAFE_INTEGER;
        let maxAge = 0;
        let schoolLevel = '';
        let targetGroupLabel = '';
        
        if (targetGroups.length > 0) {
          targetGroups.forEach(tg => {
            if (tg.minAge < minAge) minAge = tg.minAge;
            if (tg.maxAge > maxAge) maxAge = tg.maxAge;
            schoolLevel = tg.schoolLevel; // Use the last one
            targetGroupLabel = tg.targetGroupLabel; // Use the last one
          });
        }
        
        return {
          ...team,
          schoolLevel,
          targetGroupLabel,
          minAge,
          maxAge
        };
      })
    );
    
    console.log(`Found ${teams.length} unique teams for rawlist XLSX`);

    // Convert BigInt values to numbers to avoid serialization issues
    const processedTeams = teams.map(team => ({
      id: Number(team.id),
      teamName: team.teamName || '',
      teamEmail: team.teamEmail || '',
      contestName: team.contestName || '',
      contestCode: team.contestCode || '',
      status: team.status || '',
      registrationDate: team.registrationDate,
      contingentName: team.contingentName || '',
      contingentType: team.contingentType || '',
      schoolLevel: team.schoolLevel || '',
      targetGroupLabel: team.targetGroupLabel || '',
      stateName: team.stateName || ''
    }));

    // Format data for Excel export
    const excelData = processedTeams.map((team, index) => ({
      'No.': index + 1,
      'Target Group': team.targetGroupLabel || '',
      'Contest Code': team.contestCode || '',
      'Contest Name': team.contestName || '',
      'Contingent': team.contingentName || '',
      'State': team.stateName || '',
      'Team Name': team.teamName || '',
      'Team Email': team.teamEmail || '',
      'Status': team.status || '',
      'Registration Date': team.registrationDate ? new Date(team.registrationDate).toLocaleDateString('en-MY') : ''
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 5 },   // No.
      { wch: 15 },  // Target Group
      { wch: 12 },  // Contest Code
      { wch: 25 },  // Contest Name
      { wch: 30 },  // Contingent
      { wch: 15 },  // State
      { wch: 25 },  // Team Name
      { wch: 30 },  // Team Email
      { wch: 12 },  // Status
      { wch: 15 },  // Registration Date
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw List');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="rawlist-${event.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("Error generating rawlist XLSX:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        error: "Failed to generate Excel file",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
