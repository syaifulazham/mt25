import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasRequiredRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from 'xlsx';

interface ContingentData {
  id: number;
  name: string;
  contingentType: string;
  schoolId: number | null;
  higherInstId: number | null;
  independentId: number | null;
  stateName: string;
  ppd: string;
  institutionName: string;
  teamCount: number;
  participantCount: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    console.log("=== Contingents List XLSX API Called ===");
    console.log("Event ID:", params.eventId);

    // Authentication check
    const session = await getServerSession(authOptions);
    console.log("Session user:", session?.user);

    if (!session?.user) {
      console.log("No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRequiredRole(session.user, ["ADMIN", "OPERATOR"])) {
      console.log("User does not have required role:", session.user.role);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    console.log("Fetching event details...");
    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, startDate: true, endDate: true }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    console.log("Event found:", event.name);

    // Step 1: Get basic contingent data (using same query structure as working DOCX API)
    console.log("Fetching contingents...");
    const contingents = await prisma.$queryRaw`
      SELECT DISTINCT
        c.id,
        c.name,
        c.contingentType,
        c.schoolId,
        c.higherInstId,
        c.independentId
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      JOIN contingent c ON t.contingentId = c.id
      WHERE ec.eventId = ${eventId}
        AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
      ORDER BY c.name ASC
    ` as Array<{
      id: number;
      name: string;
      contingentType: string;
      schoolId: number | null;
      higherInstId: number | null;
      independentId: number | null;
    }>;

    console.log(`Found ${contingents.length} contingents`);

    // Step 2: Enrich each contingent with institution and state data
    const enrichedContingents: ContingentData[] = [];

    for (const contingent of contingents) {
      console.log(`Processing contingent: ${contingent.name}`);
      
      let stateName = "";
      let ppd = "";
      let institutionName = "";

      // Get institution details based on contingent type
      if (contingent.contingentType === "SCHOOL" && contingent.schoolId) {
        const school = await prisma.school.findUnique({
          where: { id: contingent.schoolId },
          include: { state: true }
        });
        if (school) {
          institutionName = school.name;
          stateName = school.state?.name || "";
          ppd = school.ppd || "";
        }
      } else if (contingent.contingentType === "HIGHER_INSTITUTION" && contingent.higherInstId) {
        const higherInst = await prisma.higherinstitution.findUnique({
          where: { id: contingent.higherInstId },
          include: { state: true }
        });
        if (higherInst) {
          institutionName = higherInst.name;
          stateName = higherInst.state?.name || "";
        }
      } else if (contingent.contingentType === "INDEPENDENT" && contingent.independentId) {
        const independent = await prisma.independent.findUnique({
          where: { id: contingent.independentId },
          include: { state: true }
        });
        if (independent) {
          institutionName = independent.name;
          stateName = independent.state?.name || "";
        }
      }

      // Get team count (using same query structure as working DOCX API)
      const teamCountResult = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT t.id) as teamCount
        FROM eventcontestteam ect
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        JOIN team t ON ect.teamId = t.id
        WHERE t.contingentId = ${contingent.id}
          AND ec.eventId = ${eventId}
          AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
      ` as Array<{ teamCount: bigint }>;

      const teamCount = Number(teamCountResult[0]?.teamCount || 0);

      // Get participant count (using same query structure as working DOCX API)
      const participantCountResult = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT tm.contestantId) as participantCount
        FROM eventcontestteam ect
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        JOIN team t ON ect.teamId = t.id
        JOIN teamMember tm ON t.id = tm.teamId
        WHERE t.contingentId = ${contingent.id}
          AND ec.eventId = ${eventId}
          AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
      ` as Array<{ participantCount: bigint }>;

      const participantCount = Number(participantCountResult[0]?.participantCount || 0);

      enrichedContingents.push({
        id: contingent.id,
        name: contingent.name,
        contingentType: contingent.contingentType,
        schoolId: contingent.schoolId,
        higherInstId: contingent.higherInstId,
        independentId: contingent.independentId,
        stateName,
        ppd,
        institutionName,
        teamCount,
        participantCount
      });
    }

    console.log("Creating XLSX workbook...");

    // Create XLSX workbook
    const workbook = XLSX.utils.book_new();

    // Prepare data for XLSX
    const xlsxData = enrichedContingents.map((contingent, index) => ({
      'No.': index + 1,
      'State': contingent.stateName,
      'PPD': contingent.ppd || 'N/A',
      'Contingent Name': contingent.name,
      'Contingent Type': contingent.contingentType.replace('_', ' '),
      'Institution': contingent.institutionName,
      'Team Count': contingent.teamCount,
      'Participant Count': contingent.participantCount
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(xlsxData);

    // Set column widths
    const columnWidths = [
      { wch: 5 },   // No.
      { wch: 15 },  // State
      { wch: 20 },  // PPD
      { wch: 30 },  // Contingent Name
      { wch: 18 },  // Contingent Type
      { wch: 35 },  // Institution
      { wch: 12 },  // Team Count
      { wch: 15 }   // Participant Count
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contingents List');

    // Generate XLSX buffer
    const xlsxBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    });

    console.log("XLSX generated successfully");

    // Format filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `contingents-list-${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-${currentDate}.xlsx`;

    // Return XLSX file
    return new NextResponse(xlsxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': xlsxBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("Error generating contingents list XLSX:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    
    return NextResponse.json(
      { error: "Failed to generate contingents list XLSX" },
      { status: 500 }
    );
  }
}
