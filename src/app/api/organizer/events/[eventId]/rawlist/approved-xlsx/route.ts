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

    console.log(`Fetching eligible PENDING teams for event ID: ${eventId}`);
    
    // Get teams with status PENDING that meet criteria:
    // 1. No age mismatches with target group
    // 2. No members in multiple teams
    // 3. At least one member in the team
    const eligibleTeams = await prisma.$queryRaw`
      WITH team_member_counts AS (
        SELECT 
          t.id AS teamId,
          COUNT(tm.contestantId) AS memberCount
        FROM team t
        LEFT JOIN teamMember tm ON t.id = tm.teamId
        GROUP BY t.id
      ),
      invalid_emails AS (
        SELECT 
          t.id AS teamId
        FROM team t
        WHERE 
          t.team_email IS NULL 
          OR t.team_email = ''
          OR t.team_email NOT LIKE '%@%.%'
      ),
      duplicate_members AS (
        SELECT 
          DISTINCT tm.contestantId
        FROM teamMember tm
        JOIN team t ON tm.teamId = t.id
        JOIN eventcontestteam ect ON t.id = ect.teamId
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        WHERE ec.eventId = ${eventId}
        GROUP BY tm.contestantId
        HAVING COUNT(DISTINCT tm.teamId) > 1
      ),
      teams_with_duplicates AS (
        SELECT 
          DISTINCT t.id
        FROM team t
        JOIN teamMember tm ON t.id = tm.teamId
        JOIN duplicate_members dm ON tm.contestantId = dm.contestantId
      ),
      age_mismatches AS (
        SELECT 
          DISTINCT t.id AS teamId
        FROM team t
        JOIN teamMember tm ON t.id = tm.teamId
        JOIN contestant c ON tm.contestantId = c.id
        JOIN eventcontestteam ect ON t.id = ect.teamId
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        JOIN contest ct ON ec.contestId = ct.id
        JOIN _contesttotargetgroup ctg ON ctg.A = ct.id
        JOIN targetgroup tg ON tg.id = ctg.B
        WHERE 
          ec.eventId = ${eventId}
          AND ect.status = 'PENDING'
          AND ect.status != 'APPROVED_SPECIAL'
          AND (c.age < tg.minAge OR c.age > tg.maxAge)
      )
      
      SELECT DISTINCT
        t.id,
        t.name as teamName,
        t.team_email as teamEmail,
        ct.name as contestName,
        ct.code as contestCode,
        ect.status,
        ect.createdAt as registrationDate,
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
        st_s.name as schoolStateName,
        st_hi.name as hiStateName,
        st_i.name as indStateName,
        c.name as contingentNameRaw,
        tmc.memberCount
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      JOIN contingent c ON t.contingentId = c.id
      JOIN contest ct ON ec.contestId = ct.id
      JOIN _contesttotargetgroup ctg ON ctg.A = ct.id
      JOIN targetgroup tg ON tg.id = ctg.B
      JOIN team_member_counts tmc ON t.id = tmc.teamId
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
      LEFT JOIN independent i ON c.independentId = i.id
      LEFT JOIN state st_s ON s.stateId = st_s.id
      LEFT JOIN state st_hi ON hi.stateId = st_hi.id
      LEFT JOIN state st_i ON i.stateId = st_i.id
      WHERE 
        ec.eventId = ${eventId}
        AND ect.status = 'PENDING'
        AND tmc.memberCount > 0
        AND t.id NOT IN (SELECT teamId FROM age_mismatches)
        AND t.id NOT IN (SELECT id FROM teams_with_duplicates)
        AND t.id NOT IN (SELECT teamId FROM invalid_emails)
      ORDER BY tg.schoolLevel, schoolStateName, hiStateName, indStateName, contingentNameRaw, t.name ASC
    ` as any[];
    
    console.log(`Found ${eligibleTeams.length} eligible PENDING teams for approval`);

    if (eligibleTeams.length === 0) {
      return NextResponse.json({ error: "No eligible PENDING teams found" }, { status: 404 });
    }

    // Collect team IDs for status update
    const teamIds = eligibleTeams.map(team => team.id);

    // Update team statuses one by one (more reliable than IN clause with many IDs)
    let updatedCount = 0;
    for (const teamId of teamIds) {
      const result = await prisma.eventcontestteam.updateMany({
        where: {
          teamId: teamId,
          status: 'PENDING'
        },
        data: {
          status: 'APPROVED'
        }
      });
      updatedCount += result.count;
    }
    
    console.log(`Updated ${updatedCount} teams to APPROVED status`);

    // Convert BigInt values to numbers to avoid serialization issues
    const processedTeams = eligibleTeams.map(team => ({
      id: Number(team.id),
      teamName: team.teamName || '',
      teamEmail: team.teamEmail || '',
      contestName: team.contestName || '',
      contestCode: team.contestCode || '',
      status: 'APPROVED', // Status is now APPROVED after update
      registrationDate: team.registrationDate,
      contingentName: team.contingentName || '',
      contingentType: team.contingentType || '',
      schoolLevel: team.schoolLevel || '',
      targetGroupLabel: team.targetGroupLabel || '',
      stateName: team.stateName || '',
      memberCount: Number(team.memberCount) || 0
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
      'Previous Status': 'PENDING',
      'New Status': 'APPROVED',
      'Members': team.memberCount,
      'Registration Date': team.registrationDate ? new Date(team.registrationDate).toLocaleDateString('en-MY') : ''
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 5 },    // No.
      { wch: 15 },   // Target Group
      { wch: 12 },   // Contest Code
      { wch: 25 },   // Contest Name
      { wch: 30 },   // Contingent
      { wch: 15 },   // State
      { wch: 25 },   // Team Name
      { wch: 30 },   // Team Email
      { wch: 15 },   // Previous Status
      { wch: 15 },   // New Status
      { wch: 10 },   // Members
      { wch: 15 },   // Registration Date
    ];
    worksheet['!cols'] = columnWidths;

    // Add summary data on top
    XLSX.utils.sheet_add_aoa(worksheet, [
      [`Approved Teams Summary - ${new Date().toLocaleDateString()}`],
      [`Event: ${event.name}`],
      [`Total Teams Approved: ${processedTeams.length}`],
      [`Generated by: ${(session.user as any).name || 'System'}`],
      [''],  // Empty line
    ], { origin: -1 });

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Approved Teams');

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
        'Content-Disposition': `attachment; filename="approved-teams-${event.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("Error processing approval and XLSX generation:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        error: "Failed to process approval and generate Excel file",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
