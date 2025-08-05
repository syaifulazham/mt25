import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRequiredRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from 'xlsx';

interface TeamMember {
  id: number;
  participantName: string;
  ic: string | null;
  email: string;
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

    // Use the exact same query as the Full Endlist DOCX endpoint
    console.log("Starting teams query (same as Full Endlist DOCX) for eventId:", eventId);
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
        tg.schoolLevel,
        CASE 
          WHEN tg.schoolLevel = 'Primary' THEN 'Kids'
          WHEN tg.schoolLevel = 'Secondary' THEN 'Teens'
          WHEN tg.schoolLevel = 'Higher Education' THEN 'Youth'
          ELSE tg.schoolLevel
        END as targetGroupLabel,
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
        tg.minAge,
        tg.maxAge
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      JOIN contingent c ON t.contingentId = c.id
      JOIN contest ct ON ec.contestId = ct.id
      JOIN _contesttotargetgroup ctg ON ctg.A = ct.id
      JOIN targetgroup tg ON tg.id = ctg.B
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
      LEFT JOIN independent i ON c.independentId = i.id
      LEFT JOIN state st_s ON s.stateId = st_s.id
      LEFT JOIN state st_hi ON hi.stateId = st_hi.id
      LEFT JOIN state st_i ON i.stateId = st_i.id
      WHERE ec.eventId = ${eventId}
        AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
      ORDER BY tg.schoolLevel, st_s.name, st_hi.name, st_i.name, c.name, t.name ASC
    ` as any[];

    console.log("Teams query completed, found", teams.length, "teams");
    
    if (teams.length === 0) {
      console.log("No teams found for event");
      return NextResponse.json({ error: "No teams found for this event" }, { status: 404 });
    }

    // Convert BigInt values to numbers to avoid serialization issues
    const processedTeams = teams.map((team: any) => ({
      ...team,
      id: Number(team.id),
      minAge: Number(team.minAge),
      maxAge: Number(team.maxAge)
    }));

    console.log("Starting team members query...");
    
    // Get team members with IC and email (Full Endlist includes sensitive data)
    const teamIds = processedTeams.map((team: Team) => team.id);
    console.log("Team IDs for member query:", teamIds.length, "teams");
    
    if (teamIds.length === 0) {
      console.log("No team IDs found, returning empty result");
      return NextResponse.json({ error: "No teams found for member query" }, { status: 404 });
    }
    
    // Use $queryRawUnsafe for proper IN clause with array
    const teamMembers = await prisma.$queryRawUnsafe(`
      SELECT 
        tm.teamId,
        c.id,
        c.name as participantName,
        c.ic,
        c.email,
        c.edu_level,
        c.class_grade,
        c.age,
        CASE 
          WHEN c.edu_level IS NOT NULL AND c.class_grade IS NOT NULL 
          THEN CONCAT(c.edu_level, ' - ', c.class_grade)
          WHEN c.edu_level IS NOT NULL 
          THEN c.edu_level
          WHEN c.class_grade IS NOT NULL 
          THEN c.class_grade
          ELSE 'N/A'
        END as formattedClassGrade
      FROM teamMember tm
      JOIN contestant c ON tm.contestantId = c.id
      WHERE tm.teamId IN (${teamIds.join(',')})
      ORDER BY c.name ASC
    `) as any[];

    console.log("Team members query completed, found", teamMembers.length, "members");

    // Convert BigInt values for team members
    const processedMembers = teamMembers.map((member: any) => ({
      ...member,
      id: Number(member.id),
      teamId: Number(member.teamId),
      age: member.age ? Number(member.age) : null
    }));

    // Group members by team
    const membersByTeam = processedMembers.reduce((acc: any, member: any) => {
      if (!acc[member.teamId]) {
        acc[member.teamId] = [];
      }
      acc[member.teamId].push(member);
      return acc;
    }, {});

    // Add members to teams
    const teamsWithMembers = processedTeams.map((team: Team) => ({
      ...team,
      members: membersByTeam[team.id] || []
    }));

    console.log("Teams with members prepared, starting age validation...");

    // Filter teams based on age validation (same logic as other endpoints)
    const filteredTeams = teamsWithMembers.filter((team: Team) => {
      if (team.status === 'APPROVED_SPECIAL') {
        return true; // Skip age validation for special approval
      }

      const allMembersAgeValid = team.members.every((member: TeamMember) => {
        if (!member.age) return false;
        const memberAge = member.age;
        const minAge = (team as any).minAge;
        const maxAge = (team as any).maxAge;
        return memberAge >= minAge && memberAge <= maxAge;
      });

      return allMembersAgeValid;
    });
    
    console.log("After age validation filtering:", filteredTeams.length, "teams remain");
    
    // Prepare data for Excel with the specified headers (including IC column)
    console.log("Starting XLSX data preparation...");
    const worksheetData = [];
    
    // Add headers with the IC column included
    const headers = [
      'Record Number',
      'State', 
      'Contingent',
      'Institution',
      'Team',
      'Competition',
      'Name',
      'IC',
      'Email',
      'Age'
    ];
    worksheetData.push(headers);

    // Add data rows
    let recordNumber = 1;
    filteredTeams.forEach((team: Team) => {
      team.members.forEach((member: TeamMember) => {
        const row = [
          recordNumber,
          team.stateName,
          team.contingentName,
          team.contingentName, // Institution is same as contingent in this context
          team.teamName,
          team.contestName,
          member.participantName,
          member.ic || 'N/A',
          member.email || 'N/A',
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
    console.log("Total data rows in worksheetData:", worksheetData.length);
    console.log("Sample data:", worksheetData.slice(0, 3));
    
    // Check xlsx library version and capabilities
    console.log("XLSX library version check:");
    try {
      const xlsxVersion = require('xlsx/package.json').version;
      console.log("XLSX version:", xlsxVersion);
    } catch (e) {
      console.log("Could not determine XLSX version");
    }

    try {
      // Set optimized column widths for professional appearance
      const colWidths = [
        { wch: 10 },  // Record Number
        { wch: 18 },  // State
        { wch: 30 },  // Contingent
        { wch: 30 },  // Institution
        { wch: 35 },  // Team
        { wch: 25 },  // Competition
        { wch: 30 },  // Name
        { wch: 18 },  // IC
        { wch: 35 },  // Email
        { wch: 8 }    // Age
      ];
      worksheet['!cols'] = colWidths;
      console.log("Column widths set");

      // Test minimal styling approach with extensive debugging
      try {
        console.log("Starting styling test...");
        console.log("Worksheet keys:", Object.keys(worksheet).slice(0, 10));
        console.log("Worksheet range:", worksheet['!ref']);
        
        // Test styling on just the first cell (A1)
        const testCell = 'A1';
        console.log("Testing cell A1:", worksheet[testCell]);
        
        if (worksheet[testCell]) {
          // Try the most basic styling possible
          worksheet[testCell].s = {
            font: { bold: true }
          };
          console.log("Applied basic bold to A1");
          
          // Try adding background color
          worksheet[testCell].s.fill = { fgColor: { rgb: "FF0000" } }; // Red background for testing
          console.log("Applied red background to A1");
          
          console.log("Final A1 cell:", JSON.stringify(worksheet[testCell], null, 2));
        } else {
          console.error("Cell A1 not found in worksheet!");
        }
        
        // Try styling all header cells with minimal approach
        for (let col = 0; col < 10; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          console.log(`Styling cell ${cellAddress}`);
          
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: "4472C4" } }
            };
            console.log(`Styled ${cellAddress}:`, worksheet[cellAddress].s);
          } else {
            console.warn(`Cell ${cellAddress} not found`);
          }
        }
        
        console.log("Header styling test completed");
      } catch (headerStyleError) {
        console.error("Header styling failed:", headerStyleError);
        console.error("Error stack:", headerStyleError instanceof Error ? headerStyleError.stack : 'No stack trace');
        
        // If styling fails completely, at least ensure proper data formatting
        console.log("Styling not supported - ensuring data integrity only");
        
        // Ensure IC column is at least formatted as text (most important feature)
        try {
          for (let row = 1; row <= 100; row++) { // Test first 100 rows
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: 7 });
            if (worksheet[cellAddress]) {
              worksheet[cellAddress].t = 's'; // Force string type
              break; // If this works, we know text formatting is possible
            }
          }
          console.log("Text formatting for IC column is supported");
        } catch (textError) {
          console.error("Even text formatting is not supported:", textError);
        }
      }

      // Format IC column (column H, index 7) as text to preserve leading zeros
      try {
        const actualRange = worksheet['!ref'];
        if (actualRange) {
          const range = XLSX.utils.decode_range(actualRange);
          console.log(`Formatting IC column for ${range.e.r} data rows`);
          
          for (let row = 1; row <= range.e.r; row++) { // Start from row 1 (skip header)
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: 7 }); // Column H (IC)
            if (worksheet[cellAddress]) {
              worksheet[cellAddress].z = '@'; // Text format
              if (!worksheet[cellAddress].s) {
                worksheet[cellAddress].s = {};
              }
              worksheet[cellAddress].s.numFmt = '@'; // Ensure text format
            }
          }
          console.log(`IC column formatted as text for ${range.e.r} rows`);
        }
      } catch (formatError) {
        console.warn("IC column formatting failed, continuing without formatting:", formatError);
      }

      // Skip additional styling for production compatibility (following Basic Endlist pattern)
      console.log("Skipping additional styling for production compatibility");



      // Add freeze panes to keep header visible when scrolling
      try {
        worksheet['!freeze'] = { xSplit: 0, ySplit: 1 }; // Freeze first row (header)
        console.log("Freeze panes applied to header row");
      } catch (freezeError) {
        console.warn("Freeze panes failed:", freezeError);
      }
      
    } catch (stylingError) {
      console.warn("Styling failed, continuing with basic worksheet:", stylingError);
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Full Endlist Report');

    console.log("Styling completed, generating buffer...");
    
    // Generate buffer with cellStyles option to ensure styling is included
    console.log("Generating XLSX buffer with styling options...");
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      cellStyles: true,
      sheetStubs: false
    });
    console.log("Buffer generated with styling options");
    
    console.log("Buffer generated successfully, preparing response...");

    // Return the file
    const fileName = `endlist-full-${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    console.log("Returning file:", fileName);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error("Error generating full endlist XLSX:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    
    return NextResponse.json(
      { 
        error: "Failed to generate full endlist XLSX file",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
