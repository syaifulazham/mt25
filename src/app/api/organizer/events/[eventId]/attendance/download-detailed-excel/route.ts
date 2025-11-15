import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    console.log('Download Detailed Excel API called for event:', params.eventId);
    
    // Auth check
    const session = await getServerSession(authOptions);
    
    if (!session || !(session.user.role === 'ADMIN' || session.user.role === 'OPERATOR')) {
      console.error('Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and operators can download attendance data.' },
        { status: 401 }
      );
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      console.error('Invalid event ID:', params.eventId);
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }
    
    console.log('Fetching detailed data for event ID:', eventId);

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

    // Fetch detailed contestants data with all related information
    const contestantsQuery = `
      SELECT 
        ac.id as attendanceId,
        ac.contestantId,
        c.age,
        c.gender as contestantGender,
        c.class_grade as grade,
        cg.id as contingentId,
        cg.name as contingentName,
        cg.contingentType,
        st.name as stateName,
        z.name as zoneName,
        tm.name as teamName,
        co.name as contestName,
        ac.contestGroup,
        ac.attendanceStatus,
        ac.createdAt as attendanceDate,
        COALESCE(s.name, ind.name) as institutionName,
        COALESCE(s.address, ind.address) as institutionAddress,
        s.code as schoolCode,
        s.ppd as schoolPpd,
        s.category as schoolCategory,
        s.level as schoolLevel,
        s.location as schoolLocation,
        s.latitude,
        s.longitude
      FROM attendanceContestant ac
      INNER JOIN contestant c ON ac.contestantId = c.id
      INNER JOIN teamMember tc ON c.id = tc.contestantId
      INNER JOIN team tm ON tc.teamId = tm.id
      INNER JOIN contest co ON tm.contestId = co.id
      INNER JOIN contingent cg ON tm.contingentId = cg.id
      LEFT JOIN school s ON cg.schoolId = s.id
      LEFT JOIN independent ind ON cg.independentId = ind.id
      LEFT JOIN state st ON COALESCE(s.stateId, ind.stateId) = st.id
      LEFT JOIN zone z ON st.zoneId = z.id
      WHERE ac.eventId = ${eventId}
      AND ac.attendanceStatus = 'Present'
      ${filterByContestGroup ? `AND ac.contestGroup IN (${contestGroups.map(g => `'${g}'`).join(',')})` : ''}
      ORDER BY st.name, cg.name, tm.name
    `;

    // Fetch detailed managers data
    const managersQuery = `
      SELECT DISTINCT
        am.id as attendanceId,
        am.managerId,
        cg.id as contingentId,
        cg.name as contingentName,
        cg.contingentType,
        st.name as stateName,
        z.name as zoneName,
        e.name as eventName,
        am.contestGroup,
        am.attendanceStatus,
        am.createdAt as attendanceDate,
        COALESCE(s.name, ind.name) as institutionName,
        COALESCE(s.address, ind.address) as institutionAddress,
        s.code as schoolCode,
        s.ppd as schoolPpd,
        s.category as schoolCategory,
        s.level as schoolLevel,
        s.location as schoolLocation,
        s.latitude,
        s.longitude
      FROM attendanceManager am
      INNER JOIN manager m ON am.managerId = m.id
      INNER JOIN contingent cg ON am.contingentId = cg.id
      INNER JOIN event e ON am.eventId = e.id
      LEFT JOIN school s ON cg.schoolId = s.id
      LEFT JOIN independent ind ON cg.independentId = ind.id
      LEFT JOIN state st ON COALESCE(s.stateId, ind.stateId) = st.id
      LEFT JOIN zone z ON st.zoneId = z.id
      WHERE am.eventId = ${eventId}
      AND am.attendanceStatus = 'Present'
      ${filterByContestGroup ? `AND am.contestGroup IN (${contestGroups.map(g => `'${g}'`).join(',')})` : ''}
      ORDER BY st.name, cg.name
    `;

    console.log('Executing contestants query...');
    console.log('Query:', contestantsQuery.substring(0, 200) + '...');
    let contestants: any[] = [];
    try {
      contestants = await prisma.$queryRawUnsafe<any[]>(contestantsQuery);
      console.log(`✓ Fetched ${contestants.length} contestants`);
    } catch (error: any) {
      console.error('❌ Contestants query failed:', error.message);
      throw new Error(`Contestants query failed: ${error.message}`);
    }

    console.log('Executing managers query...');
    console.log('Query:', managersQuery.substring(0, 200) + '...');
    let managers: any[] = [];
    try {
      managers = await prisma.$queryRawUnsafe<any[]>(managersQuery);
      console.log(`✓ Fetched ${managers.length} managers`);
    } catch (error: any) {
      console.error('❌ Managers query failed:', error.message);
      throw new Error(`Managers query failed: ${error.message}`);
    }

    // Format contestants data for Excel
    const contestantsData = contestants.map((contestant: any, index: number) => ({
      'No.': index + 1,
      'Contestant ID': String(contestant.contestantId || ''),
      'Age': String(contestant.age || 'N/A'),
      'Gender': String(contestant.contestantGender || 'N/A'),
      'Grade': String(contestant.grade || 'N/A'),
      'Contingent': String(contestant.contingentName || ''),
      'Contingent Type': String(contestant.contingentType || ''),
      'State': String(contestant.stateName || ''),
      'Zone': String(contestant.zoneName || 'N/A'),
      'Team': String(contestant.teamName || 'N/A'),
      'Contest': String(contestant.contestName || 'N/A'),
      'Contest Group': String(contestant.contestGroup || 'N/A'),
      'Institution Name': String(contestant.institutionName || 'N/A'),
      'Institution Address': String(contestant.institutionAddress || 'N/A'),
      'School Code': String(contestant.schoolCode || 'N/A'),
      'School PPD': String(contestant.schoolPpd || 'N/A'),
      'School Category': String(contestant.schoolCategory || 'N/A'),
      'School Level': String(contestant.schoolLevel || 'N/A'),
      'Locality Type': String(contestant.schoolLocation || 'N/A'),
      'Latitude': contestant.latitude ? String(contestant.latitude) : 'N/A',
      'Longitude': contestant.longitude ? String(contestant.longitude) : 'N/A',
      'Attendance Status': String(contestant.attendanceStatus || '')
    }));

    // Format managers data for Excel
    const managersData = managers.map((manager: any, index: number) => ({
      'No.': index + 1,
      'Manager ID': String(manager.managerId || ''),
      'Contingent': String(manager.contingentName || ''),
      'Contingent Type': String(manager.contingentType || ''),
      'State': String(manager.stateName || ''),
      'Zone': String(manager.zoneName || 'N/A'),
      'Event': String(manager.eventName || 'N/A'),
      'Contest Group': String(manager.contestGroup || 'N/A'),
      'Institution Name': String(manager.institutionName || 'N/A'),
      'Institution Address': String(manager.institutionAddress || 'N/A'),
      'School Code': String(manager.schoolCode || 'N/A'),
      'School PPD': String(manager.schoolPpd || 'N/A'),
      'School Category': String(manager.schoolCategory || 'N/A'),
      'School Level': String(manager.schoolLevel || 'N/A'),
      'Locality Type': String(manager.schoolLocation || 'N/A'),
      'Latitude': manager.latitude ? String(manager.latitude) : 'N/A',
      'Longitude': manager.longitude ? String(manager.longitude) : 'N/A',
      'Attendance Status': String(manager.attendanceStatus || '')
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create contestants worksheet
    const contestantsWorksheet = XLSX.utils.json_to_sheet(contestantsData);
    
    // Set column widths for contestants sheet
    contestantsWorksheet['!cols'] = [
      { wch: 5 },  // No.
      { wch: 12 }, // Contestant ID
      { wch: 8 },  // Age
      { wch: 10 }, // Gender
      { wch: 8 },  // Grade
      { wch: 30 }, // Contingent
      { wch: 15 }, // Contingent Type
      { wch: 20 }, // State
      { wch: 15 }, // Zone
      { wch: 25 }, // Team
      { wch: 30 }, // Contest
      { wch: 15 }, // Contest Group
      { wch: 40 }, // Institution Name
      { wch: 50 }, // Institution Address
      { wch: 12 }, // School Code
      { wch: 20 }, // School PPD
      { wch: 15 }, // School Category
      { wch: 15 }, // School Level
      { wch: 15 }, // Locality Type
      { wch: 12 }, // Latitude
      { wch: 12 }, // Longitude
      { wch: 15 }, // Attendance Status
    ];

    XLSX.utils.book_append_sheet(workbook, contestantsWorksheet, 'Contestants Details');

    // Create managers worksheet
    const managersWorksheet = XLSX.utils.json_to_sheet(managersData);
    
    // Set column widths for managers sheet
    managersWorksheet['!cols'] = [
      { wch: 5 },  // No.
      { wch: 12 }, // Manager ID
      { wch: 30 }, // Contingent
      { wch: 15 }, // Contingent Type
      { wch: 20 }, // State
      { wch: 15 }, // Zone
      { wch: 30 }, // Event
      { wch: 15 }, // Contest Group
      { wch: 40 }, // Institution Name
      { wch: 50 }, // Institution Address
      { wch: 12 }, // School Code
      { wch: 20 }, // School PPD
      { wch: 15 }, // School Category
      { wch: 15 }, // School Level
      { wch: 15 }, // Locality Type
      { wch: 12 }, // Latitude
      { wch: 12 }, // Longitude
      { wch: 15 }, // Attendance Status
    ];

    XLSX.utils.book_append_sheet(workbook, managersWorksheet, 'Managers Details');

    // Create summary sheet
    const summaryData = [
      { 'Metric': 'Event Name', 'Value': String(event.name || '') },
      { 'Metric': 'Total Attended Contestants', 'Value': Number(contestants.length) },
      { 'Metric': 'Total Attended Managers', 'Value': Number(managers.length) },
      { 'Metric': 'Total Attended Participants', 'Value': Number(contestants.length + managers.length) },
      { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() },
      { 'Metric': 'Export Type', 'Value': 'Detailed Information with Institution Data' },
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
    console.log('Generating detailed Excel buffer...');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    console.log('Detailed Excel buffer generated successfully, size:', excelBuffer.length);

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filterSuffix = filterByContestGroup ? `_${contestGroups.join('-')}` : '';
    const filename = `Attendance_Detailed_Event${eventId}${filterSuffix}_${timestamp}.xlsx`;

    // Return Excel file
    console.log('Returning detailed Excel file:', filename);
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('Error generating detailed attendance Excel:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to generate detailed Excel file',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
