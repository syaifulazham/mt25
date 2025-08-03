import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = parseInt(params.eventId);
    
    // Get event details
    const eventResult = await prisma.$queryRaw<any[]>`
      SELECT name, scopeArea FROM event WHERE id = ${eventId}
    `;
    
    if (!eventResult || eventResult.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    const event = eventResult[0];
    const scopeArea = event.scopeArea;
    
    // Get hierarchical data directly (avoiding internal fetch)
    // Recreate the same logic as the overview API
    const individualContestsQuery = `
      SELECT 
        c.name as contestName,
        ac.contestGroup,
        s.name as stateName,
        COUNT(DISTINCT ac.contingentId) as contingentCount,
        COUNT(DISTINCT ac.teamId) as teamCount,
        COUNT(DISTINCT ac.contestantId) as contestantCount
      FROM attendanceContestant ac
      LEFT JOIN team t ON ac.teamId = t.id
      LEFT JOIN contest c ON t.contestId = c.id
      LEFT JOIN contingent cont ON ac.contingentId = cont.id
      LEFT JOIN school sch ON cont.schoolId = sch.id
      LEFT JOIN higherinstitution hi ON cont.higherInstId = hi.id
      LEFT JOIN independent ind ON cont.independentId = ind.id
      LEFT JOIN state s ON (
        CASE 
          WHEN cont.contingentType = 'SCHOOL' AND sch.stateId IS NOT NULL THEN sch.stateId
          WHEN cont.contingentType = 'HIGHER_INSTITUTION' AND hi.stateId IS NOT NULL THEN hi.stateId
          WHEN cont.contingentType = 'INDEPENDENT' AND ind.stateId IS NOT NULL THEN ind.stateId
          ELSE NULL
        END
      ) = s.id
      WHERE ac.eventId = ${eventId}
      GROUP BY c.id, c.name, ac.contestGroup, s.id, s.name
      ORDER BY s.name, ac.contestGroup, c.name
    `;
    
    const individualContests = await prisma.$queryRawUnsafe(individualContestsQuery) as any[];
    
    // Get general summary
    const generalSummaryResult = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(DISTINCT ac.contingentId) as totalContingents,
        COUNT(DISTINCT ac.teamId) as totalTeams,
        COUNT(DISTINCT ac.contestantId) as totalContestants,
        COUNT(DISTINCT c.id) as totalContests
      FROM attendanceContestant ac
      LEFT JOIN team t ON ac.teamId = t.id
      LEFT JOIN contest c ON t.contestId = c.id
      WHERE ac.eventId = ${eventId}
    `;
    
    const generalSummary = {
      totalContingents: Number(generalSummaryResult[0].totalContingents),
      totalTeams: Number(generalSummaryResult[0].totalTeams),
      totalContestants: Number(generalSummaryResult[0].totalContestants),
      totalContests: Number(generalSummaryResult[0].totalContests)
    };
    
    // Build hierarchical structure
    const hierarchicalData = { generalSummary, states: [] as any[] };
    
    if (scopeArea === 'ZONE') {
      // Group by state first, then contest group
      const stateGroups = individualContests.reduce((acc: any, contest: any) => {
        const stateName = contest.stateName || 'Unknown State';
        if (!acc[stateName]) acc[stateName] = [];
        acc[stateName].push(contest);
        return acc;
      }, {});
      
      for (const [stateName, stateContests] of Object.entries(stateGroups) as [string, any[]][]) {
        const stateSummary = {
          totalContingents: stateContests.reduce((sum, c) => sum + Number(c.contingentCount), 0),
          totalTeams: stateContests.reduce((sum, c) => sum + Number(c.teamCount), 0),
          totalContestants: stateContests.reduce((sum, c) => sum + Number(c.contestantCount), 0)
        };
        
        const contestGroups = stateContests.reduce((acc: any, contest: any) => {
          const groupName = contest.contestGroup || 'Unknown Group';
          if (!acc[groupName]) acc[groupName] = [];
          acc[groupName].push(contest);
          return acc;
        }, {});
        
        const contestGroupsArray = Object.entries(contestGroups).map(([contestGroup, contests]) => ({
          contestGroup,
          contestGroupSummary: {
            totalContingents: (contests as any[]).reduce((sum, c) => sum + Number(c.contingentCount), 0),
            totalTeams: (contests as any[]).reduce((sum, c) => sum + Number(c.teamCount), 0),
            totalContestants: (contests as any[]).reduce((sum, c) => sum + Number(c.contestantCount), 0)
          },
          contests: (contests as any[]).map(c => ({
            contestName: c.contestName,
            contingentCount: Number(c.contingentCount),
            teamCount: Number(c.teamCount),
            contestantCount: Number(c.contestantCount)
          }))
        }));
        
        hierarchicalData.states.push({
          stateName,
          stateSummary,
          contestGroups: contestGroupsArray
        });
      }
    } else {
      // Group by contest group only
      const contestGroups = individualContests.reduce((acc: any, contest: any) => {
        const groupName = contest.contestGroup || 'Unknown Group';
        if (!acc[groupName]) acc[groupName] = [];
        acc[groupName].push(contest);
        return acc;
      }, {});
      
      const contestGroupsArray = Object.entries(contestGroups).map(([contestGroup, contests]) => ({
        contestGroup,
        contestGroupSummary: {
          totalContingents: (contests as any[]).reduce((sum, c) => sum + Number(c.contingentCount), 0),
          totalTeams: (contests as any[]).reduce((sum, c) => sum + Number(c.teamCount), 0),
          totalContestants: (contests as any[]).reduce((sum, c) => sum + Number(c.contestantCount), 0)
        },
        contests: (contests as any[]).map(c => ({
          contestName: c.contestName,
          contingentCount: Number(c.contingentCount),
          teamCount: Number(c.teamCount),
          contestantCount: Number(c.contestantCount)
        }))
      }));
      
      hierarchicalData.states.push({
        stateName: 'All States',
        stateSummary: generalSummary,
        contestGroups: contestGroupsArray
      });
    }

    // Prepare data for Excel with table format
    const summaryData = [
      ['General Summary', ''],
      ['', ''],
      ['Metric', 'Count'],
      ['Total Competitions', generalSummary.totalContests],
      ['Total Contingents', generalSummary.totalContingents],
      ['Total Teams', generalSummary.totalTeams],
      ['Total Contestants', generalSummary.totalContestants],
      ['', ''], // Empty row for spacing
      [''],
      ['Competitions Details'],
      ['']
    ];

    // Prepare hierarchical data rows
    const hierarchicalRows: any[] = [];
    
    hierarchicalData.states.forEach((state: any) => {
      // Add state header (for ZONE events)
      if (scopeArea === 'ZONE') {
        hierarchicalRows.push(['']);
        hierarchicalRows.push([`${state.stateName} State`, '', '', '', '', '']);
        hierarchicalRows.push(['']);
        hierarchicalRows.push(['State Summary', '', '', '', '', '']);
        hierarchicalRows.push(['Metric', 'Count', '', '', '', '']);
        hierarchicalRows.push(['Total Contingents', state.stateSummary.totalContingents, '', '', '', '']);
        hierarchicalRows.push(['Total Teams', state.stateSummary.totalTeams, '', '', '', '']);
        hierarchicalRows.push(['Total Contestants', state.stateSummary.totalContestants, '', '', '', '']);
        hierarchicalRows.push(['']);
      }
      
      // Add contest groups
      state.contestGroups.forEach((group: any) => {
        hierarchicalRows.push([`${group.contestGroup} Contest Group`, '', '', '', '', '']);
        hierarchicalRows.push([`Group Total - Contingents: ${group.contestGroupSummary.totalContingents}, Teams: ${group.contestGroupSummary.totalTeams}, Contestants: ${group.contestGroupSummary.totalContestants}`, '', '', '', '', '']);
        hierarchicalRows.push(['']);
        
        // Add contest header
        hierarchicalRows.push(['Contest', 'Contingents', 'Teams', 'Contestants', '', '']);
        
        // Add contests
        group.contests.forEach((contest: any) => {
          hierarchicalRows.push([
            contest.contestName,
            contest.contingentCount,
            contest.teamCount,
            contest.contestantCount,
            '',
            ''
          ]);
        });
        
        hierarchicalRows.push(['']); // Spacing after group
      });
    });

    // Combine all data
    const worksheetData = [
      ...summaryData,
      ...hierarchicalRows
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const colWidths = scopeArea === 'ZONE' 
      ? [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 }]
      : [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
    
    worksheet['!cols'] = colWidths;

    // Style the summary section
    const summaryRange = XLSX.utils.decode_range('A1:B6');
    for (let row = summaryRange.s.r; row <= summaryRange.e.r; row++) {
      for (let col = summaryRange.s.c; col <= summaryRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: row === 0 || row === 7 }, // Bold for titles
            alignment: { horizontal: 'left' }
          };
        }
      }
    }

    // Style hierarchical headers (state and contest group headers will be bold)
    // This is handled automatically by the hierarchical structure

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Competitions Overview');

    // Generate Excel file
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const filename = `competitions-overview-${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error generating competitions overview XLSX:', error);
    return NextResponse.json(
      { error: 'Failed to generate competitions overview spreadsheet' },
      { status: 500 }
    );
  }
}
