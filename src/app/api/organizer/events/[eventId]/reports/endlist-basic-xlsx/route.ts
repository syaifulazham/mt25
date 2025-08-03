import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRequiredRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from 'xlsx';

interface TeamMember {
  id: number;
  participantName: string;
  edu_level: string | null;
  class_grade: string | null;
  age: number | null;
  formattedClassGrade: string;
}

interface Team {
  id: number;
  teamName: string;
  status: string;
  registrationDate: string;
  contingentName: string;
  contingentType: string;
  schoolLevel: string;
  targetGroupLabel: string;
  stateName: string;
  ppd: string;
  contestName: string;
  members: TeamMember[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRequiredRole(session.user, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Get event details
    console.log("Fetching event details for eventId:", eventId);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { name: true, startDate: true, endDate: true }
    });

    if (!event) {
      console.log("Event not found for eventId:", eventId);
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    console.log("Event found:", event.name);

    // Use a simpler query without the problematic targetgroup JOIN for production
    console.log("Starting simplified teams query for eventId:", eventId);
    const teams = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.name as teamName,
        ect.status,
        ect.createdAt as registrationDate,
        ct.name as contestName,
        CASE 
          WHEN c.contingentType = 'SCHOOL' THEN s.name
          WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN hi.name
          WHEN c.contingentType = 'INDEPENDENT' THEN i.name
          ELSE 'Unknown'
        END as contingentName,
        c.contingentType as contingentType,
        'General' as schoolLevel,
        'General' as targetGroupLabel,
        CASE 
          WHEN c.contingentType = 'SCHOOL' THEN st_s.name
          WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN st_hi.name
          WHEN c.contingentType = 'INDEPENDENT' THEN st_i.name
          ELSE 'Unknown State'
        END as stateName,
        CASE 
          WHEN c.contingentType = 'SCHOOL' THEN s.ppd
          WHEN c.contingentType = 'INDEPENDENT' THEN 'INDEPENDENT'
          ELSE 'Unknown PPD'
        END as ppd,
        NULL as minAge,
        NULL as maxAge
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
        AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
      ORDER BY st_s.name, st_hi.name, st_i.name, c.name, t.name ASC
    ` as any[];

    console.log("Teams query completed, found", teams.length, "teams");
    
    if (teams.length === 0) {
      console.log("No teams found. Checking event data...");
      
      // Check if event has any teams at all
      const allTeamsCheck = await prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM eventcontestteam ect
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        WHERE ec.eventId = ${eventId}
      ` as any[];
      
      console.log("Total teams in event (any status):", allTeamsCheck[0]?.total || 0);
      
      // Check team statuses
      const statusCheck = await prisma.$queryRaw`
        SELECT ect.status, COUNT(*) as count
        FROM eventcontestteam ect
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        WHERE ec.eventId = ${eventId}
        GROUP BY ect.status
      ` as any[];
      
      console.log("Team statuses in event:", statusCheck);
      
      // Check if the complex JOIN is the issue
      const simpleTeamsCheck = await prisma.$queryRaw`
        SELECT 
          t.id,
          t.name as teamName,
          ect.status
        FROM eventcontestteam ect
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        JOIN team t ON ect.teamId = t.id
        WHERE ec.eventId = ${eventId}
          AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
        LIMIT 5
      ` as any[];
      
      console.log("Sample teams with basic query:", simpleTeamsCheck);
    }
    
    // Convert BigInt values to numbers to avoid serialization issues
    const processedTeams = teams.map((team: any) => ({
      ...team,
      id: Number(team.id),
      minAge: team.minAge ? Number(team.minAge) : null,
      maxAge: team.maxAge ? Number(team.maxAge) : null
    }));
    
    console.log("Starting team members queries...");

    // Fetch team members for each team (process in smaller batches for production)
    const teamsWithMembers = [];
    const batchSize = 10; // Process teams in smaller batches to avoid memory issues
    
    for (let i = 0; i < processedTeams.length; i += batchSize) {
      const batch = processedTeams.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(processedTeams.length/batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(async (team: any) => {
          try {
            const membersRaw = await prisma.$queryRaw`
              SELECT 
                con.id,
                con.name as participantName,
                con.edu_level,
                con.class_grade,
                con.age,
                CASE 
                  WHEN con.class_grade IS NOT NULL AND con.class_grade != '' THEN con.class_grade
                  WHEN con.edu_level IS NOT NULL AND con.edu_level != '' THEN con.edu_level
                  ELSE 'N/A'
                END as formattedClassGrade
              FROM teammember tm
              JOIN contestant con ON tm.contestantId = con.id
              WHERE tm.teamId = ${team.id}
              ORDER BY con.name ASC
            ` as any[];

            // Convert BigInt values to numbers
            const members = membersRaw.map((member: any) => ({
              ...member,
              id: Number(member.id),
              age: member.age ? Number(member.age) : null
            })) as TeamMember[];

            return {
              ...team,
              members
            };
          } catch (memberError) {
            console.error(`Error fetching members for team ${team.id}:`, memberError);
            return {
              ...team,
              members: []
            };
          }
        })
      );
      
      teamsWithMembers.push(...batchResults);
    }

    console.log("Team members queries completed, found", teamsWithMembers.length, "teams with members");
    
    // Prepare data for Excel with the specified headers
    console.log("Starting XLSX data preparation...");
    const worksheetData = [];
    
    // Add headers with the specified columns
    const headers = [
      'Record Number',
      'State', 
      'Contingent',
      'Institution',
      'Team',
      'Competition',
      'Name',
      'Age'
    ];
    worksheetData.push(headers);

    // Add data rows
    let recordNumber = 1;
    teamsWithMembers.forEach((team: Team) => {
      team.members.forEach((member: TeamMember) => {
        const row = [
          recordNumber,
          team.stateName,
          team.contingentName,
          team.contingentName, // Institution is same as contingent in this context
          team.teamName,
          team.contestName,
          member.participantName,
          member.age || 'N/A'
        ];
        worksheetData.push(row);
        recordNumber++;
      });
    });

    console.log("Data preparation completed, creating workbook...");
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    console.log("Workbook and worksheet created, applying styling...");

    try {
      // Set column widths
      const colWidths = [
        { wch: 12 }, // Record Number
        { wch: 15 }, // State
        { wch: 25 }, // Contingent
        { wch: 25 }, // Institution
        { wch: 30 }, // Team
        { wch: 20 }, // Contest
        { wch: 25 }, // Name
        { wch: 8 }   // Age
      ];
      worksheet['!cols'] = colWidths;
      console.log("Column widths set");

      // Style the header row with colors (simplified for production)
      try {
        const headerRange = XLSX.utils.decode_range('A1:H1');
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "4472C4" } }, // Blue background
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
        console.log("Header styling applied");
      } catch (headerStyleError) {
        console.warn("Header styling failed, continuing without styling:", headerStyleError);
      }

      // Skip border styling for production to avoid memory issues
      console.log("Skipping border styling for production compatibility");
      
    } catch (stylingError) {
      console.warn("Styling failed, continuing with basic worksheet:", stylingError);
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Basic Endlist Report');

    console.log("Styling completed, generating buffer...");
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    console.log("Buffer generated successfully, preparing response...");

    // Return the file
    const fileName = `endlist-basic-${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    console.log("Returning file:", fileName);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error("Error generating basic endlist XLSX:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    
    return NextResponse.json(
      { 
        error: "Failed to generate basic endlist XLSX file",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
