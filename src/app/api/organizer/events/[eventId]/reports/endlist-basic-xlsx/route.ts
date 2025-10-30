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

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

    // Use the exact same query as the working DOCX endpoint
    console.log("Starting teams query (same as DOCX) for eventId:", eventId);
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
      ORDER BY tg.schoolLevel, stateName, contingentName, teamName ASC
    ` as any[];

    console.log("Teams query completed, found", teams.length, "teams");
    
    // Deduplicate teams by ID (same as frontend does)
    // Teams can appear multiple times if registered in multiple target groups
    const uniqueTeams = teams.filter((team: any, index: number, self: any[]) => 
      index === self.findIndex((t: any) => Number(t.id) === Number(team.id))
    );
    
    console.log(`Total teams from query: ${teams.length}, Unique teams after deduplication: ${uniqueTeams.length}`);
    
    if (uniqueTeams.length === 0) {
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
      
      // Check what statuses we're looking for vs what exists
      console.log("We are filtering for statuses: APPROVED, ACCEPTED, APPROVED_SPECIAL");
      
      // Try a query with ALL statuses to see if we get any results
      const allStatusTeams = await prisma.$queryRaw`
        SELECT 
          t.id,
          t.name as teamName,
          ect.status,
          ct.name as contestName
        FROM eventcontestteam ect
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        JOIN team t ON ect.teamId = t.id
        JOIN contest ct ON ec.contestId = ct.id
        WHERE ec.eventId = ${eventId}
        LIMIT 10
      ` as any[];
      
      console.log("Sample teams with ANY status:", allStatusTeams);
      
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
    const processedTeams = uniqueTeams.map((team: any) => ({
      ...team,
      id: Number(team.id),
      minAge: team.minAge ? Number(team.minAge) : null,
      maxAge: team.maxAge ? Number(team.maxAge) : null
    }));
    
    console.log("Starting team members queries...");

    // Fetch team members for each team using the exact same logic as main endlist API
    const teamsWithMembers = await Promise.all(
      processedTeams.map(async (team: any) => {
        const membersRaw = await prisma.$queryRaw`
          SELECT 
            con.id,
            con.name as participantName,
            con.email,
            con.ic,
            con.edu_level,
            con.class_grade,
            con.age,
            CASE 
              WHEN LOWER(con.class_grade) = 'ppki' THEN con.class_grade
              WHEN con.edu_level = 'sekolah rendah' THEN CONCAT('Darjah ', COALESCE(con.class_grade, ''))
              WHEN con.edu_level = 'sekolah menengah' THEN CONCAT('Tingkatan ', COALESCE(con.class_grade, ''))
              ELSE CONCAT('Darjah/ Tingkatan ', COALESCE(con.class_grade, ''))
            END as formattedClassGrade,
            CASE 
              WHEN c.contingentType = 'SCHOOL' THEN s.name
              WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN hi.name
              WHEN c.contingentType = 'INDEPENDENT' THEN i.name
              ELSE 'Unknown'
            END as contingentName,
            c.contingentType as contingentType
          FROM teamMember tm
          JOIN contestant con ON tm.contestantId = con.id
          JOIN contingent c ON con.contingentId = c.id
          LEFT JOIN school s ON c.schoolId = s.id
          LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
          LEFT JOIN independent i ON c.independentId = i.id
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
          members: members || []
        };
      })
    );

    console.log("Team members queries completed, found", teamsWithMembers.length, "teams with members");
    
    // No longer filtering out teams based on age validation
    // All teams with APPROVED, APPROVED_SPECIAL, or ACCEPTED status will be included
    // This matches the behavior in the endlist monitoring page
    const filteredTeams = teamsWithMembers;
    
    // Log teams with potential age validation issues for reference
    const teamsWithAgeIssues = teamsWithMembers.filter((team) => {
      if (team.status === 'APPROVED_SPECIAL') {
        return false; // No issues for APPROVED_SPECIAL
      }
      const allMembersAgeValid = team.members.every((member: any) => {
        const memberAge = parseInt(member.age);
        const minAge = parseInt(team.minAge);
        const maxAge = parseInt(team.maxAge);
        if (isNaN(memberAge) || isNaN(minAge) || isNaN(maxAge)) return false;
        return memberAge >= minAge && memberAge <= maxAge;
      });
      return !allMembersAgeValid;
    });
    
    console.log(`Total teams: ${teamsWithMembers.length}, Teams with age validation issues (still included): ${teamsWithAgeIssues.length}`);
    
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
