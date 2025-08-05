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
    const teamMembers = await prisma.$queryRaw`
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
    ` as any[];

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

      // Apply professional styling to the entire table
      try {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:J1');
        
        // Style the header row with professional colors
        const headerRange = XLSX.utils.decode_range('A1:J1');
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = {
              font: { 
                bold: true, 
                color: { rgb: "FFFFFF" },
                size: 12,
                name: "Calibri"
              },
              fill: { fgColor: { rgb: "2F5597" } }, // Professional dark blue
              alignment: { 
                horizontal: 'center', 
                vertical: 'center',
                wrapText: false
              },
              border: {
                top: { style: 'thin', color: { rgb: "000000" } },
                bottom: { style: 'thin', color: { rgb: "000000" } },
                left: { style: 'thin', color: { rgb: "000000" } },
                right: { style: 'thin', color: { rgb: "000000" } }
              }
            };
          }
        }
        
        // Style data rows with alternating colors and borders
        for (let row = 1; row <= range.e.r; row++) {
          const isEvenRow = row % 2 === 0;
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (worksheet[cellAddress]) {
              worksheet[cellAddress].s = {
                font: {
                  size: 11,
                  name: "Calibri",
                  color: { rgb: "000000" }
                },
                fill: { 
                  fgColor: { 
                    rgb: isEvenRow ? "F8F9FA" : "FFFFFF" // Light gray for even rows, white for odd
                  } 
                },
                alignment: {
                  horizontal: col === 0 ? 'center' : (col === 9 ? 'center' : 'left'), // Center for Record# and Age, left for others
                  vertical: 'center',
                  wrapText: false
                },
                border: {
                  top: { style: 'thin', color: { rgb: "D1D5DB" } },
                  bottom: { style: 'thin', color: { rgb: "D1D5DB" } },
                  left: { style: 'thin', color: { rgb: "D1D5DB" } },
                  right: { style: 'thin', color: { rgb: "D1D5DB" } }
                }
              };
            }
          }
        }
        
        console.log("Professional table styling applied");
      } catch (headerStyleError) {
        console.warn("Table styling failed, continuing without styling:", headerStyleError);
      }

      // Format IC column (column H, index 7) as text to preserve leading zeros
      try {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:J1');
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
        console.log("IC column formatted as text");
      } catch (formatError) {
        console.warn("IC column formatting failed, continuing without formatting:", formatError);
      }

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
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
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
