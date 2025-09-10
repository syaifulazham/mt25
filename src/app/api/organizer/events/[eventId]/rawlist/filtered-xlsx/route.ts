import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from 'xlsx';

// Endpoint that accepts team IDs from frontend and generates Excel without changing status
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["ADMIN", "OPERATOR", "VIEWER"].includes(userRole)) {
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

    // Get team IDs from request body
    const { teamIds } = await request.json();
    
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      return NextResponse.json({ error: "No team IDs provided" }, { status: 400 });
    }
    
    console.log(`Received ${teamIds.length} team IDs for filtered export`);

    // Use separate queries to get related data to avoid Prisma schema issues
    console.log(`Finding teams with IDs: ${teamIds.join(', ')}`)

    // Get basic team info
    const teams = await prisma.team.findMany({
      where: {
        id: {
          in: teamIds.map(id => parseInt(id))
        }
      },
      select: {
        id: true,
        name: true,
        team_email: true,
        contingentId: true
      }
    });

    console.log(`Found ${teams.length} teams`)
    
    // Get contingent info for these teams
    const contingentIds = teams.map(team => team.contingentId);
    const contingents = await prisma.contingent.findMany({
      where: {
        id: { in: contingentIds }
      },
      select: {
        id: true,
        name: true,
        contingentType: true,
        schoolId: true,
        higherInstId: true,
        independentId: true
      }
    });
    
    // Get related institutions and states
    const schoolIds = contingents.filter(c => c.contingentType === 'SCHOOL' && c.schoolId).map(c => c.schoolId);
    const schools = await prisma.school.findMany({
      where: {
        id: { in: schoolIds as number[] }
      },
      select: {
        id: true,
        name: true,
        state: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    const higherInstIds = contingents.filter(c => c.contingentType === 'HIGHER_INSTITUTION' && c.higherInstId).map(c => c.higherInstId);
    const higherInsts = await prisma.higherinstitution.findMany({
      where: {
        id: { in: higherInstIds as number[] }
      },
      select: {
        id: true,
        name: true,
        state: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    const independentIds = contingents.filter(c => c.contingentType === 'INDEPENDENT' && c.independentId).map(c => c.independentId);
    const independents = await prisma.independent.findMany({
      where: {
        id: { in: independentIds as number[] }
      },
      select: {
        id: true,
        name: true,
        state: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Get event contest teams
    const eventcontestTeams = await prisma.eventcontestteam.findMany({
      where: {
        teamId: { in: teamIds.map(id => parseInt(id)) },
        eventcontest: {
          eventId
        }
      },
      select: {
        id: true,
        teamId: true,
        status: true,
        createdAt: true,
        eventcontest: {
          select: {
            contest: {
              select: {
                id: true,
                name: true,
                code: true,
                targetgroup: {
                  select: {
                    id: true,
                    schoolLevel: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Create lookup maps for faster data retrieval
    interface SchoolMap { [key: number]: typeof schools[0] }
    interface HigherInstMap { [key: number]: typeof higherInsts[0] }
    interface IndependentMap { [key: number]: typeof independents[0] }
    interface ContingentMap { [key: number]: typeof contingents[0] }
    interface TeamMap { [key: number]: typeof teams[0] }
    
    const schoolsMap = schools.reduce<SchoolMap>((map, school) => ({ ...map, [school.id]: school }), {});
    const higherInstsMap = higherInsts.reduce<HigherInstMap>((map, inst) => ({ ...map, [inst.id]: inst }), {});
    const independentsMap = independents.reduce<IndependentMap>((map, ind) => ({ ...map, [ind.id]: ind }), {});
    const contingentsMap = contingents.reduce<ContingentMap>((map, contingent) => ({ ...map, [contingent.id]: contingent }), {});
    const teamsMap = teams.reduce<TeamMap>((map, team) => ({ ...map, [team.id]: team }), {});
    
    // Process data without status changes
    let processedTeams = [];

    // Process each event contest team
    for (const ect of eventcontestTeams) {
      // Get related data using maps
      const team = teamsMap[ect.teamId];
      if (!team) continue;
      
      const contingent = contingentsMap[team.contingentId];
      if (!contingent) continue;
      
      // Format team data for Excel
      const targetGroupLabel = ect.eventcontest.contest.targetgroup[0]?.schoolLevel || 'Unknown';
      const displayTargetGroup = 
        targetGroupLabel === 'Primary' ? 'Kids' :
        targetGroupLabel === 'Secondary' ? 'Teens' :
        targetGroupLabel === 'Higher Education' ? 'Youth' : 
        targetGroupLabel;
      
      // Get state and institution info based on contingent type
      let stateName = 'Unknown';
      let contingentName = contingent.name || 'Unknown';
      
      if (contingent.contingentType === 'SCHOOL' && contingent.schoolId) {
        const school = schoolsMap[contingent.schoolId];
        if (school) {
          stateName = school.state?.name || 'Unknown';
          contingentName = school.name || contingentName;
        }
      } else if (contingent.contingentType === 'HIGHER_INSTITUTION' && contingent.higherInstId) {
        const higherInst = higherInstsMap[contingent.higherInstId];
        if (higherInst) {
          stateName = higherInst.state?.name || 'Unknown';
          contingentName = higherInst.name || contingentName;
        }
      } else if (contingent.contingentType === 'INDEPENDENT' && contingent.independentId) {
        const independent = independentsMap[contingent.independentId];
        if (independent) {
          stateName = independent.state?.name || 'Unknown';
          contingentName = independent.name || contingentName;
        }
      }
      
      processedTeams.push({
        id: team.id,
        teamName: team.name,
        teamEmail: team.team_email,
        contestName: ect.eventcontest.contest.name,
        contestCode: ect.eventcontest.contest.code,
        status: ect.status,  // Keep original status
        registrationDate: ect.createdAt,
        contingentName,
        contingentType: contingent.contingentType,
        targetGroupLabel: displayTargetGroup,
        stateName
      });
    }
    
    console.log(`Processed ${processedTeams.length} teams for export`);
    
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
      { wch: 5 },    // No.
      { wch: 15 },   // Target Group
      { wch: 12 },   // Contest Code
      { wch: 25 },   // Contest Name
      { wch: 30 },   // Contingent
      { wch: 15 },   // State
      { wch: 25 },   // Team Name
      { wch: 30 },   // Team Email
      { wch: 15 },   // Status
      { wch: 15 },   // Registration Date
    ];
    worksheet['!cols'] = columnWidths;

    // Add summary data on top
    XLSX.utils.sheet_add_aoa(worksheet, [
      [`Filtered Teams Export - ${new Date().toLocaleDateString()}`],
      [`Event: ${event.name}`],
      [`Total Teams: ${processedTeams.length}`],
      [`Generated by: ${(session.user as any).name || 'System'}`],
      [''],  // Empty line
    ], { origin: -1 });

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Teams');

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
        'Content-Disposition': `attachment; filename="filtered-teams-${event.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating filtered Excel:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate filtered Excel file",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
