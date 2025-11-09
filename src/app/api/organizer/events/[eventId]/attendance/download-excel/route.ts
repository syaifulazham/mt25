import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    
    if (!session || !(session.user.role === 'ADMIN' || session.user.role === 'OPERATOR')) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and operators can download attendance data.' },
        { status: 401 }
      );
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    // Parse contest group filters from URL
    const { searchParams } = new URL(request.url);
    const contestGroups: string[] = [];
    
    if (searchParams.has('kids')) contestGroups.push('Kids');
    if (searchParams.has('teens')) contestGroups.push('Teens');
    if (searchParams.has('youth')) contestGroups.push('Youth');
    
    const filterByContestGroup = contestGroups.length > 0;

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Define result types
    type ContestantResult = {
      id: number | bigint;
      contestantId: number | bigint;
      name: string;
      ic: string | null;
      contingentName: string;
      stateName: string;
      teamName: string | null;
      contestName: string | null;
      contestGroup: string | null;
      attendanceStatus: string;
      attendanceDate: Date | null;
      attendanceTime: Date | null;
    }[];

    type ManagerResult = {
      id: number | bigint;
      managerId: number | bigint;
      name: string;
      ic: string | null;
      phone: string | null;
      contingentName: string;
      stateName: string;
      contestGroup: string | null;
      attendanceStatus: string;
      attendanceDate: Date | null;
      attendanceTime: Date | null;
    }[];

    // Fetch attended contestants
    const contestants = filterByContestGroup
      ? await prisma.$queryRaw<ContestantResult>`
          SELECT 
            ac.id,
            ac.contestantId,
            c.name,
            c.ic,
            cg.name as contingentName,
            s.name as stateName,
            t.name as teamName,
            con.name as contestName,
            ac.contestGroup,
            ac.attendanceStatus,
            ac.attendanceDate,
            ac.attendanceTime
          FROM attendanceContestant ac
          JOIN contestant c ON ac.contestantId = c.id
          JOIN contingent cg ON ac.contingentId = cg.id
          JOIN state s ON ac.stateId = s.id
          LEFT JOIN team t ON ac.teamId = t.id
          LEFT JOIN contest con ON t.contestId = con.id
          WHERE ac.eventId = ${eventId}
            AND ac.attendanceStatus = 'Present'
            AND ac.contestGroup IN (${Prisma.join(contestGroups)})
          ORDER BY s.name, cg.name, c.name
        `
      : await prisma.$queryRaw<ContestantResult>`
          SELECT 
            ac.id,
            ac.contestantId,
            c.name,
            c.ic,
            cg.name as contingentName,
            s.name as stateName,
            t.name as teamName,
            con.name as contestName,
            ac.contestGroup,
            ac.attendanceStatus,
            ac.attendanceDate,
            ac.attendanceTime
          FROM attendanceContestant ac
          JOIN contestant c ON ac.contestantId = c.id
          JOIN contingent cg ON ac.contingentId = cg.id
          JOIN state s ON ac.stateId = s.id
          LEFT JOIN team t ON ac.teamId = t.id
          LEFT JOIN contest con ON t.contestId = con.id
          WHERE ac.eventId = ${eventId}
            AND ac.attendanceStatus = 'Present'
          ORDER BY s.name, cg.name, c.name
        `;

    // Fetch attended managers
    const managers = filterByContestGroup
      ? await prisma.$queryRaw<ManagerResult>`
          SELECT 
            am.id,
            am.managerId,
            m.name,
            m.ic,
            m.phone,
            cg.name as contingentName,
            s.name as stateName,
            am.contestGroup,
            am.attendanceStatus,
            am.attendanceDate,
            am.attendanceTime
          FROM attendanceManager am
          JOIN contingentManager m ON am.managerId = m.id
          JOIN contingent cg ON am.contingentId = cg.id
          JOIN state s ON am.stateId = s.id
          WHERE am.eventId = ${eventId}
            AND am.attendanceStatus = 'Present'
            AND am.contestGroup IN (${Prisma.join(contestGroups)})
          ORDER BY s.name, cg.name, m.name
        `
      : await prisma.$queryRaw<ManagerResult>`
          SELECT 
            am.id,
            am.managerId,
            m.name,
            m.ic,
            m.phone,
            cg.name as contingentName,
            s.name as stateName,
            am.contestGroup,
            am.attendanceStatus,
            am.attendanceDate,
            am.attendanceTime
          FROM attendanceManager am
          JOIN contingentManager m ON am.managerId = m.id
          JOIN contingent cg ON am.contingentId = cg.id
          JOIN state s ON am.stateId = s.id
          WHERE am.eventId = ${eventId}
            AND am.attendanceStatus = 'Present'
          ORDER BY s.name, cg.name, m.name
        `;

    // Format contestants data for Excel
    const contestantsData = contestants.map((contestant: any, index: number) => ({
      'No.': index + 1,
      'Name': contestant.name,
      'IC Number': contestant.ic || 'N/A',
      'Contingent': contestant.contingentName,
      'State': contestant.stateName,
      'Team': contestant.teamName || 'N/A',
      'Contest': contestant.contestName || 'N/A',
      'Contest Group': contestant.contestGroup || 'N/A',
      'Attendance Date': contestant.attendanceDate 
        ? new Date(contestant.attendanceDate).toLocaleDateString() 
        : 'N/A',
      'Attendance Time': contestant.attendanceTime
        ? new Date(contestant.attendanceTime).toLocaleTimeString()
        : 'N/A'
    }));

    // Format managers data for Excel
    const managersData = managers.map((manager: any, index: number) => ({
      'No.': index + 1,
      'Name': manager.name,
      'IC Number': manager.ic || 'N/A',
      'Phone': manager.phone || 'N/A',
      'Contingent': manager.contingentName,
      'State': manager.stateName,
      'Contest Group': manager.contestGroup || 'N/A',
      'Attendance Date': manager.attendanceDate 
        ? new Date(manager.attendanceDate).toLocaleDateString() 
        : 'N/A',
      'Attendance Time': manager.attendanceTime
        ? new Date(manager.attendanceTime).toLocaleTimeString()
        : 'N/A'
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create contestants worksheet
    const contestantsWorksheet = XLSX.utils.json_to_sheet(contestantsData);
    
    // Set column widths for contestants sheet
    contestantsWorksheet['!cols'] = [
      { wch: 5 },  // No.
      { wch: 30 }, // Name
      { wch: 15 }, // IC Number
      { wch: 30 }, // Contingent
      { wch: 20 }, // State
      { wch: 25 }, // Team
      { wch: 30 }, // Contest
      { wch: 15 }, // Contest Group
      { wch: 15 }, // Attendance Date
      { wch: 15 }, // Attendance Time
    ];

    XLSX.utils.book_append_sheet(workbook, contestantsWorksheet, 'Contestants');

    // Create managers worksheet
    const managersWorksheet = XLSX.utils.json_to_sheet(managersData);
    
    // Set column widths for managers sheet
    managersWorksheet['!cols'] = [
      { wch: 5 },  // No.
      { wch: 30 }, // Name
      { wch: 15 }, // IC Number
      { wch: 15 }, // Phone
      { wch: 30 }, // Contingent
      { wch: 20 }, // State
      { wch: 15 }, // Contest Group
      { wch: 15 }, // Attendance Date
      { wch: 15 }, // Attendance Time
    ];

    XLSX.utils.book_append_sheet(workbook, managersWorksheet, 'Managers');

    // Create summary sheet
    const summaryData = [
      { 'Metric': 'Event Name', 'Value': event.name },
      { 'Metric': 'Total Attended Contestants', 'Value': contestants.length },
      { 'Metric': 'Total Attended Managers', 'Value': managers.length },
      { 'Metric': 'Total Attended Participants', 'Value': contestants.length + managers.length },
      { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() },
    ];

    if (filterByContestGroup) {
      summaryData.push({
        'Metric': 'Filters Applied',
        'Value': contestGroups.join(', ')
      });
    }

    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    summaryWorksheet['!cols'] = [
      { wch: 30 }, // Metric
      { wch: 50 }, // Value
    ];

    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filterSuffix = filterByContestGroup ? `_${contestGroups.join('-')}` : '';
    const filename = `Attendance_Event${eventId}${filterSuffix}_${timestamp}.xlsx`;

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('Error generating attendance Excel:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate Excel file',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
