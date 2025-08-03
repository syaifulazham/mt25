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
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { name: true, startDate: true, endDate: true }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch teams using the same structure as the DOCX endpoint
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

    // Convert BigInt values to numbers to avoid serialization issues
    const processedTeams = teams.map((team: any) => ({
      ...team,
      id: Number(team.id),
      minAge: team.minAge ? Number(team.minAge) : null,
      maxAge: team.maxAge ? Number(team.maxAge) : null
    }));

    // Fetch team members for each team
    const teamsWithMembers = await Promise.all(
      processedTeams.map(async (team: any) => {
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
      })
    );

    // Prepare data for Excel with the specified headers
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

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

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

    // Style the header row with colors
    const headerRange = XLSX.utils.decode_range('A1:H1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } }, // Blue background
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: "000000" } },
            bottom: { style: 'thin', color: { rgb: "000000" } },
            left: { style: 'thin', color: { rgb: "000000" } },
            right: { style: 'thin', color: { rgb: "000000" } }
          }
        };
      }
    }

    // Add borders to all data cells
    const dataRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:H1');
    for (let row = dataRange.s.r + 1; row <= dataRange.e.r; row++) {
      for (let col = dataRange.s.c; col <= dataRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            border: {
              top: { style: 'thin', color: { rgb: "000000" } },
              bottom: { style: 'thin', color: { rgb: "000000" } },
              left: { style: 'thin', color: { rgb: "000000" } },
              right: { style: 'thin', color: { rgb: "000000" } }
            }
          };
        }
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Basic Endlist Report');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return the file
    const fileName = `endlist-basic-${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error("Error generating basic endlist XLSX:", error);
    return NextResponse.json(
      { error: "Failed to generate basic endlist XLSX file" },
      { status: 500 }
    );
  }
}
