import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, TextRun, HeadingLevel } from 'docx';
import { formatNumber } from '@/lib/utils/format';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

    // Create DOCX document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: `Competitions Overview - ${event.name}`,
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // General Summary section
          new Paragraph({
            children: [
              new TextRun({
                text: "General Summary",
                bold: true,
                size: 24,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          
          // General Summary Table
          new Table({
            width: {
              size: 60,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true })] })],
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    shading: { fill: "E6E6E6" },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Count", bold: true })] })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "E6E6E6" },
                  }),
                ],
              }),
              // Data rows
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun("Total Competitions")] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: formatNumber(generalSummary.totalContests), bold: true })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun("Total Contingents")] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: formatNumber(generalSummary.totalContingents), bold: true })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun("Total Teams")] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: formatNumber(generalSummary.totalTeams), bold: true })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun("Total Contestants")] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: formatNumber(generalSummary.totalContestants), bold: true })] })],
                  }),
                ],
              }),
            ],
          }),
          
          // Spacing after table
          new Paragraph({
            children: [new TextRun("")],
            spacing: { after: 400 },
          }),

          // Hierarchical Competitions Details
          new Paragraph({
            children: [
              new TextRun({
                text: "Competitions Details",
                bold: true,
                size: 24,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),

          // Generate hierarchical content
          ...hierarchicalData.states.flatMap((state: any) => [
            // State header (for ZONE events)
            ...(scopeArea === 'ZONE' ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${state.stateName} State`,
                    bold: true,
                    size: 20,
                    color: "0066CC",
                  }),
                ],
                spacing: { before: 300, after: 100 },
              }),
              // State Summary Table
              new Table({
                width: {
                  size: 60,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true })] })],
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        shading: { fill: "CCE5FF" },
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Count", bold: true })] })],
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        shading: { fill: "CCE5FF" },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun("Total Contingents")] })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: formatNumber(state.stateSummary.totalContingents), bold: true })] })],
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun("Total Teams")] })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: formatNumber(state.stateSummary.totalTeams), bold: true })] })],
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun("Total Contestants")] })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: formatNumber(state.stateSummary.totalContestants), bold: true })] })],
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({
                children: [new TextRun("")],
                spacing: { after: 200 },
              }),
            ] : []),
            
            // Contest groups within state
            ...state.contestGroups.flatMap((group: any) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${group.contestGroup} Contest Group`,
                    bold: true,
                    size: 16,
                    color: "009900",
                  }),
                ],
                spacing: { before: 200, after: 100 },
              }),
              // Contest Group Summary Table
              new Table({
                width: {
                  size: 60,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true })] })],
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        shading: { fill: "CCFFCC" },
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Count", bold: true })] })],
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        shading: { fill: "CCFFCC" },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun("Total Contingents")] })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: formatNumber(group.contestGroupSummary.totalContingents), bold: true })] })],
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun("Total Teams")] })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: formatNumber(group.contestGroupSummary.totalTeams), bold: true })] })],
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun("Total Contestants")] })],
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: formatNumber(group.contestGroupSummary.totalContestants), bold: true })] })],
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({
                children: [new TextRun("")],
                spacing: { after: 100 },
              }),
              
              // Contest table for this group
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  // Header row
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Contest", bold: true })] })],
                        width: { size: 40, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Contingents", bold: true })] })],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Teams", bold: true })] })],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "Contestants", bold: true })] })],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                      }),
                    ],
                  }),
                  // Contest rows
                  ...group.contests.map((contest: any) => 
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph({ children: [new TextRun(contest.contestName)] })],
                        }),
                        new TableCell({
                          children: [new Paragraph({ children: [new TextRun(formatNumber(contest.contingentCount))] })],
                        }),
                        new TableCell({
                          children: [new Paragraph({ children: [new TextRun(formatNumber(contest.teamCount))] })],
                        }),
                        new TableCell({
                          children: [new Paragraph({ children: [new TextRun(formatNumber(contest.contestantCount))] })],
                        }),
                      ],
                    })
                  ),
                ],
              }),
              
              // Spacing after table
              new Paragraph({
                children: [new TextRun("")],
                spacing: { after: 200 },
              }),
            ]),
          ]),
        ],
      }],
    });

    // Generate the document
    const buffer = await Packer.toBuffer(doc);
    
    const filename = `competitions-overview-${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error generating competitions overview DOCX:', error);
    return NextResponse.json(
      { error: 'Failed to generate competitions overview document' },
      { status: 500 }
    );
  }
}
