import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, HeadingLevel } from "docx";

interface TeamMember {
  id: number;
  participantName: string;
  email: string;
  ic: string | null;
  edu_level: string | null;
  class_grade: string | null;
  age: number | null;
  formattedClassGrade: string;
}

interface Manager {
  id: number;
  name: string;
  ic: string | null;
  phoneNumber: string | null;
  email: string | null;
  teamId: number;
  teamName: string;
  contestName: string;
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
      select: { name: true, startDate: true, endDate: true }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch teams using the same structure as the working endlist API
    const teams = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.name as teamName,
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

    // Fetch team members for each team using the same structure as the working endlist API
    const teamsWithMembers = await Promise.all(
      teams.map(async (team: any) => {
        const members = await prisma.$queryRaw`
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
            END as formattedClassGrade
          FROM teamMember tm
          JOIN contestant con ON tm.contestantId = con.id
          WHERE tm.teamId = ${team.id}
          ORDER BY con.name ASC
        ` as any[];

        return {
          ...team,
          members: members || []
        };
      })
    );

    // Filter out teams where any member's age doesn't match target group age range
    // unless the team status is 'APPROVED_SPECIAL'
    const filteredTeams = teamsWithMembers.filter((team: any) => {
      // If team status is APPROVED_SPECIAL, always include the team
      if (team.status === 'APPROVED_SPECIAL') {
        return true;
      }

      // Check if all members' ages are within the target group age range
      const allMembersAgeValid = team.members.every((member: any) => {
        const memberAge = parseInt(member.age);
        const minAge = parseInt(team.minAge);
        const maxAge = parseInt(team.maxAge);
        
        // If age data is missing or invalid, exclude the team for safety
        if (isNaN(memberAge) || isNaN(minAge) || isNaN(maxAge)) {
          return false;
        }
        
        // Check if member age is within the target group range
        return memberAge >= minAge && memberAge <= maxAge;
      });

      return allMembersAgeValid;
    });

    const processedTeams = filteredTeams;

    // Calculate summary statistics by state and PPD
    const statePpdSummary = processedTeams.reduce((acc: Record<string, Record<string, { schools: Set<string>, teams: number, contestants: number }>>, team: any) => {
      const state = team.stateName || 'Unknown State';
      const ppd = team.ppd || 'Unknown PPD';
      
      if (!acc[state]) {
        acc[state] = {};
      }
      
      if (!acc[state][ppd]) {
        acc[state][ppd] = {
          schools: new Set(),
          teams: 0,
          contestants: 0
        };
      }
      
      acc[state][ppd].schools.add(team.contingentName);
      acc[state][ppd].teams += 1;
      acc[state][ppd].contestants += team.members.length;
      
      return acc;
    }, {});
    
    // Calculate summary statistics by state and target group (Kids, Teens, Youth)
    const stateTargetGroupSummary = processedTeams.reduce((acc: Record<string, Record<string, number>>, team: any) => {
      const state = team.stateName || 'Unknown State';
      const targetGroup = team.targetGroupLabel || 'Unknown';
      
      if (!acc[state]) {
        acc[state] = {
          'Kids': 0,
          'Teens': 0,
          'Youth': 0,
          'Unknown': 0
        };
      }
      
      // Add the number of members/contestants to the appropriate target group
      if (['Kids', 'Teens', 'Youth'].includes(targetGroup)) {
        acc[state][targetGroup] += team.members.length;
      } else {
        acc[state]['Unknown'] += team.members.length;
      }
      
      return acc;
    }, {});

    // Convert to hierarchical array format for display
    const summaryData: Array<{
      type: 'zone' | 'state' | 'ppd';
      name: string;
      contingents: number;
      teams: number;
      contestants: number;
      level: number;
    }> = [];

    // Add zone summary (total for all states)
    const zoneTotals = Object.values(statePpdSummary).reduce((totals, statePpds) => {
      Object.values(statePpds).forEach(ppdData => {
        totals.contingents += ppdData.schools.size;
        totals.teams += ppdData.teams;
        totals.contestants += ppdData.contestants;
      });
      return totals;
    }, { contingents: 0, teams: 0, contestants: 0 });

    summaryData.push({
      type: 'zone',
      name: 'Zone Tengah',
      contingents: zoneTotals.contingents,
      teams: zoneTotals.teams,
      contestants: zoneTotals.contestants,
      level: 0
    });

    // Add states and their PPDs
    Object.entries(statePpdSummary)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([state, ppds]) => {
        // Calculate state totals
        const stateTotals = Object.values(ppds).reduce((totals, ppdData) => {
          totals.contingents += ppdData.schools.size;
          totals.teams += ppdData.teams;
          totals.contestants += ppdData.contestants;
          return totals;
        }, { contingents: 0, teams: 0, contestants: 0 });

        // Add state summary
        summaryData.push({
          type: 'state',
          name: state.toUpperCase(),
          contingents: stateTotals.contingents,
          teams: stateTotals.teams,
          contestants: stateTotals.contestants,
          level: 1
        });

        // Add PPD summaries for this state
        Object.entries(ppds)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([ppd, ppdData]) => {
            summaryData.push({
              type: 'ppd',
              name: ppd,
              contingents: ppdData.schools.size,
              teams: ppdData.teams,
              contestants: ppdData.contestants,
              level: 2
            });
          });
      });

    // Fetch managers for all teams in processedTeams
    const teamIds = processedTeams.map(team => team.id);
    
    // Query managers directly and get their teams
    const managers = await prisma.manager.findMany({
      where: {
        OR: [
          // Managers directly associated with a team
          {
            teamId: {
              in: teamIds
            }
          },
          // Managers associated through manager_team
          {
            teams: {
              some: {
                teamId: {
                  in: teamIds
                }
              }
            }
          }
        ]
      },
      include: {
        team: true,       // Direct team relation
        teams: {          // Teams through manager_team
          include: {
            team: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    // Get all event contests for the teams we're dealing with
    const eventContestTeams = await prisma.eventcontestteam.findMany({
      where: {
        teamId: {
          in: teamIds
        }
      },
      include: {
        eventcontest: {
          include: {
            contest: true
          }
        },
        team: true
      }
    });
    
    // Create a map of teamId -> contest names for easy lookup
    const teamContestsMap: Record<number, {contestNames: string[], teamName: string}> = {};
    eventContestTeams.forEach(ect => {
      const teamId = ect.teamId;
      const contestName = ect.eventcontest.contest.name;
      
      if (!teamContestsMap[teamId]) {
        teamContestsMap[teamId] = {
          contestNames: [],
          teamName: ect.team.name
        };
      }
      
      if (!teamContestsMap[teamId].contestNames.includes(contestName)) {
        teamContestsMap[teamId].contestNames.push(contestName);
      }
    });
    
    // Transform the results to match our Manager interface
    const transformedManagers: Manager[] = [];
    
    managers.forEach(manager => {
      // Get team IDs this manager manages (either directly or through manager_team)
      const managedTeamIds: number[] = [];
      
      // Add direct team if it exists and is in our target teams
      if (manager.teamId && teamIds.includes(manager.teamId)) {
        managedTeamIds.push(manager.teamId);
      }
      
      // Add teams from manager_team relationship
      manager.teams.forEach(mt => {
        if (teamIds.includes(mt.teamId) && !managedTeamIds.includes(mt.teamId)) {
          managedTeamIds.push(mt.teamId);
        }
      });
      
      // If the manager manages any of our teams, include them
      if (managedTeamIds.length > 0) {
        // Collect team names and contest names
        const teamNames: string[] = [];
        const contestNames: string[] = [];
        
        managedTeamIds.forEach(teamId => {
          if (teamContestsMap[teamId]) {
            teamNames.push(teamContestsMap[teamId].teamName);
            contestNames.push(...teamContestsMap[teamId].contestNames);
          }
        });
        
        // Create unique lists
        const uniqueTeamNames = [...new Set(teamNames)];
        const uniqueContestNames = [...new Set(contestNames)];
        
        transformedManagers.push({
          id: manager.id,
          name: manager.name,
          ic: manager.ic,
          phoneNumber: manager.phoneNumber,
          email: manager.email,
          teamId: managedTeamIds[0], // Just use the first team ID for reference
          teamName: uniqueTeamNames.join(", "),
          contestName: uniqueContestNames.join(", ")
        });
      }
    });
    
    // Group managers by contingentName and teamId
    const managersByContingent = processedTeams.reduce((acc: Record<string, Manager[]>, team: Team) => {
      const contingent = team.contingentName;
      
      if (!acc[contingent]) acc[contingent] = [];
      
      const teamManagers = transformedManagers.filter(m => m.teamId === team.id);
      // Add only unique managers (by id) to avoid duplicates
      teamManagers.forEach(manager => {
        const exists = acc[contingent].some(m => m.id === manager.id);
        if (!exists) {
          acc[contingent].push(manager);
        } else {
          // If manager exists, update their entry to include this team/contest
          const existingManager = acc[contingent].find(m => m.id === manager.id);
          if (existingManager && existingManager.teamName !== manager.teamName) {
            existingManager.teamName += `, ${manager.teamName}`;
            existingManager.contestName += `, ${manager.contestName}`;
          }
        }
      });
      
      return acc;
    }, {} as Record<string, Manager[]>);

    // Group teams by target group, state, PPD, and contingent
    const groupedTeams = processedTeams.reduce((acc: Record<string, Record<string, Record<string, Record<string, Team[]>>>>, team: Team) => {
      const targetGroup = team.targetGroupLabel;
      const state = team.stateName;
      const ppd = team.ppd || 'Unknown PPD';
      const contingent = team.contingentName;

      if (!acc[targetGroup]) acc[targetGroup] = {};
      if (!acc[targetGroup][state]) acc[targetGroup][state] = {};
      if (!acc[targetGroup][state][ppd]) acc[targetGroup][state][ppd] = {};
      if (!acc[targetGroup][state][ppd][contingent]) acc[targetGroup][state][ppd][contingent] = [];
      
      acc[targetGroup][state][ppd][contingent].push(team);
      return acc;
    }, {} as Record<string, Record<string, Record<string, Record<string, Team[]>>>>);

    // Generate DOCX document
    const children = [];
    let teamCounter = 1;

    // Title
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `End List - ${event.name}`, bold: true, size: 32, font: 'Calibri' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );
    
    // Summary by Target Group (Kids, Teens, Youth) Section
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Summary by Age Group and State", bold: true, size: 24, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 }
      })
    );
    
    // Create target group summary table
    // First, get total for each target group
    const targetGroupTotals = {
      'Kids': 0,
      'Teens': 0,
      'Youth': 0,
      'Unknown': 0,
      'Total': 0
    };
    
    Object.values(stateTargetGroupSummary).forEach(stateSummary => {
      targetGroupTotals['Kids'] += stateSummary['Kids'] || 0;
      targetGroupTotals['Teens'] += stateSummary['Teens'] || 0;
      targetGroupTotals['Youth'] += stateSummary['Youth'] || 0;
      targetGroupTotals['Unknown'] += stateSummary['Unknown'] || 0;
    });
    
    targetGroupTotals['Total'] = 
      targetGroupTotals['Kids'] + 
      targetGroupTotals['Teens'] + 
      targetGroupTotals['Youth'] + 
      targetGroupTotals['Unknown'];
    
    // Create rows for the table with states and their target group counts
    const targetGroupRows = [
      // Header row
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "State", bold: true, font: 'Calibri', color: 'FFFFFF' })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "829fd1" },
            verticalAlign: AlignmentType.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Kids", bold: true, font: 'Calibri', color: 'FFFFFF' })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "829fd1" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Teens", bold: true, font: 'Calibri', color: 'FFFFFF' })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "829fd1" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Youth", bold: true, font: 'Calibri', color: 'FFFFFF' })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "829fd1" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Total", bold: true, font: 'Calibri', color: 'FFFFFF' })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "829fd1" }
          })
        ]
      })
    ];
    
    // Add rows for each state
    Object.entries(stateTargetGroupSummary)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([state, counts]) => {
        const stateTotal = counts['Kids'] + counts['Teens'] + counts['Youth'] + counts['Unknown'];
        
        targetGroupRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: state, bold: true, font: 'Calibri' })],
                  alignment: AlignmentType.LEFT
                })],
                shading: { fill: "E6E6E6" }
              }),
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: counts['Kids'].toString(), font: 'Calibri' })],
                  alignment: AlignmentType.CENTER
                })]
              }),
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: counts['Teens'].toString(), font: 'Calibri' })],
                  alignment: AlignmentType.CENTER
                })]
              }),
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: counts['Youth'].toString(), font: 'Calibri' })],
                  alignment: AlignmentType.CENTER
                })]
              }),
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: stateTotal.toString(), font: 'Calibri', bold: true })],
                  alignment: AlignmentType.CENTER
                })],
                shading: { fill: "F2F2F2" }
              })
            ]
          })
        );
      });
    
    // Add a total row
    targetGroupRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Total", bold: true, font: 'Calibri', color: 'FFFFFF', size: 24 })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "829fd1" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: targetGroupTotals['Kids'].toString(), bold: true, font: 'Calibri', color: 'FFFFFF', size: 24 })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "829fd1" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: targetGroupTotals['Teens'].toString(), bold: true, font: 'Calibri', color: 'FFFFFF', size: 24 })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "829fd1" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: targetGroupTotals['Youth'].toString(), bold: true, font: 'Calibri', color: 'FFFFFF', size: 24 })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "829fd1" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: targetGroupTotals['Total'].toString(), bold: true, font: 'Calibri', color: 'FFFFFF', size: 28 })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "829fd1" }
          })
        ]
      })
    );
    
    // Create the target group summary table
    const targetGroupTable = new Table({
      rows: targetGroupRows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      }
    });
    
    children.push(targetGroupTable);
    children.push(new Paragraph({ text: "", spacing: { after: 400 } })); // Spacer

    // Summary by PPD Section
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Summary by State", bold: true, size: 24, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 }
      })
    );

    // Summary Table
    const summaryTable = new Table({
      rows: [
        // Header row
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "State/PPD", bold: true, font: 'Calibri' })],
                alignment: AlignmentType.CENTER
              })],
              shading: { fill: "E6E6E6" }
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Contingents", bold: true, font: 'Calibri' })],
                alignment: AlignmentType.CENTER
              })],
              shading: { fill: "E6E6E6" }
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Teams", bold: true, font: 'Calibri' })],
                alignment: AlignmentType.CENTER
              })],
              shading: { fill: "E6E6E6" }
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Contestants", bold: true, font: 'Calibri' })],
                alignment: AlignmentType.CENTER
              })],
              shading: { fill: "E6E6E6" }
            })
          ]
        }),
        // Data rows
        ...summaryData.map(item => new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: '  '.repeat(item.level) + item.name,
                  font: 'Calibri',
                  bold: item.type === 'zone'
                })],
                alignment: AlignmentType.LEFT
              })],
              shading: item.type === 'state' ? { fill: '829fd1' } : undefined
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: item.contingents.toString(),
                  font: 'Calibri',
                  color: item.type === 'state' ? 'FFFFFF' : undefined,
                  bold: item.type === 'zone',
                  size: item.type === 'zone' ? 28 : 24
                })],
                alignment: AlignmentType.CENTER
              })],
              shading: item.type === 'state' ? { fill: '829fd1' } : undefined
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: item.teams.toString(),
                  font: 'Calibri',
                  color: item.type === 'state' ? 'FFFFFF' : undefined,
                  bold: item.type === 'zone',
                  size: item.type === 'zone' ? 28 : 24
                })],
                alignment: AlignmentType.CENTER
              })],
              shading: item.type === 'state' ? { fill: '829fd1' } : undefined
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: item.contestants.toString(),
                  font: 'Calibri',
                  color: item.type === 'state' ? 'FFFFFF' : undefined,
                  bold: item.type === 'zone',
                  size: item.type === 'zone' ? 28 : 24
                })],
                alignment: AlignmentType.CENTER
              })],
              shading: item.type === 'state' ? { fill: '829fd1' } : undefined
            })
          ]
        }))
      ],
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      }
    });

    children.push(summaryTable);
    children.push(new Paragraph({ text: "", spacing: { after: 400 } })); // Spacer

    // Date range
    children.push(
      new Paragraph({
        children: [new TextRun({ 
          text: `Event Period: ${new Date(event.startDate).toLocaleDateString('en-GB')} - ${new Date(event.endDate).toLocaleDateString('en-GB')}`,
          size: 24,
          font: 'Calibri'
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      })
    );

    // Generate grouped content
    for (const [targetGroup, statesData] of Object.entries(groupedTeams)) {
      // Target Group Header
      children.push(
        new Paragraph({
          children: [new TextRun({ text: targetGroup, bold: true, size: 28, font: 'Calibri' })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        })
      );

      for (const [stateName, ppdsData] of Object.entries(statesData as Record<string, Record<string, Record<string, Team[]>>>)) {
        // State Header
        children.push(
          new Paragraph({
            children: [new TextRun({ text: stateName, bold: true, size: 24, font: 'Calibri' })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 }
          })
        );

        for (const [ppdName, contingentsData] of Object.entries(ppdsData as Record<string, Record<string, Team[]>>)) {
          // PPD Header
          children.push(
            new Paragraph({
              children: [new TextRun({ text: ppdName, bold: true, size: 22, font: 'Calibri' })],
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 250, after: 125 }
            })
          );

          for (const [contingentName, teams] of Object.entries(contingentsData as Record<string, Team[]>)) {
            // Contingent Header
            children.push(
              new Paragraph({
                children: [new TextRun({ text: contingentName, bold: true, size: 20, font: 'Calibri' })],
                heading: HeadingLevel.HEADING_4,
                spacing: { before: 200, after: 100 }
              })
            );
            
            // Add Managers Table if there are managers for this contingent
            if (managersByContingent[contingentName] && managersByContingent[contingentName].length > 0) {
              // Add Managers header
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: "Managers", bold: true, font: 'Calibri' })],
                  spacing: { before: 100, after: 50 }
                })
              );
              
              // Create managers table
              const managerTableRows = [
                new TableRow({
                  children: [
                    new TableCell({ 
                      children: [new Paragraph({ children: [new TextRun({ text: "Name", bold: true , font: 'Calibri'})] })],
                      shading: { fill: "E6E6E6" }
                    }),
                    new TableCell({ 
                      children: [new Paragraph({ children: [new TextRun({ text: "IC", bold: true , font: 'Calibri'})] })],
                      shading: { fill: "E6E6E6" }
                    }),
                    new TableCell({ 
                      children: [new Paragraph({ children: [new TextRun({ text: "Telefon", bold: true , font: 'Calibri'})] })],
                      shading: { fill: "E6E6E6" }
                    }),
                    new TableCell({ 
                      children: [new Paragraph({ children: [new TextRun({ text: "Email", bold: true , font: 'Calibri'})] })],
                      shading: { fill: "E6E6E6" }
                    }),
                    new TableCell({ 
                      children: [new Paragraph({ children: [new TextRun({ text: "Teams/Contests", bold: true , font: 'Calibri'})] })],
                      shading: { fill: "E6E6E6" }
                    })
                  ]
                })
              ];
              
              managersByContingent[contingentName].forEach((manager: Manager) => {
                // Create a cell for teams and contests
                const teamContestCell = new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: manager.teamName, bold: true })]
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: manager.contestName, italics: true })]
                    })
                  ]
                });
                
                managerTableRows.push(
                  new TableRow({
                    children: [
                      new TableCell({ 
                        children: [new Paragraph(manager.name)],
                        shading: { fill: "F2F2F2" }
                      }),
                      new TableCell({ 
                        children: [new Paragraph(manager.ic || 'N/A')],
                        shading: { fill: "F2F2F2" }
                      }),
                      new TableCell({ 
                        children: [new Paragraph(manager.phoneNumber || 'N/A')],
                        shading: { fill: "F2F2F2" }
                      }),
                      new TableCell({ 
                        children: [new Paragraph(manager.email || 'N/A')],
                        shading: { fill: "F2F2F2" }
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: manager.teamName, bold: true, font: 'Calibri' })]
                          }),
                          new Paragraph({
                            children: [new TextRun({ text: manager.contestName, italics: true, font: 'Calibri' })]
                          })
                        ],
                        shading: { fill: "F2F2F2" }
                      })
                    ]
                  })
                );
              });
              
              const managerTable = new Table({
                rows: managerTableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                }
              });
              
              children.push(managerTable);
              children.push(new Paragraph({ text: "", spacing: { after: 100 } })); // Spacer
            }

            (teams as Team[]).forEach((team: Team) => {
              // Team header with record number
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: `${teamCounter}. `, bold: true, font: 'Calibri' }),
                    new TextRun({ text: team.teamName, bold: true, font: 'Calibri' }),
                    new TextRun({ text: ` (${team.status})`, italics: true, font: 'Calibri' })
                  ],
                  spacing: { before: 150, after: 100 }
                })
              );

              // Members table
              const memberTableRows = [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No.", bold: true, font: 'Calibri' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Name", bold: true, font: 'Calibri' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "IC", bold: true, font: 'Calibri' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Class/Grade", bold: true, font: 'Calibri' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Age", bold: true, font: 'Calibri' })] })] }),
                  ]
                })
              ];

              team.members.forEach((member: TeamMember, index: number) => {
                memberTableRows.push(
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(index + 1), font: 'Calibri' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.participantName, font: 'Calibri' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.ic || 'N/A', font: 'Calibri' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.formattedClassGrade || 'N/A', font: 'Calibri' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(member.age || 'N/A'), font: 'Calibri' })] })] }),
                    ]
                  })
                );
              });

              const memberTable = new Table({
                rows: memberTableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                }
              });

              children.push(memberTable);
              children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
              teamCounter++;
            });
          }
        }
      }
    }
    const totalTeams = processedTeams.length;
    const totalParticipants = processedTeams.reduce((total: number, team: Team) => total + team.members.length, 0);
    
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Summary", bold: true, size: 24, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 600, after: 200 }
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Total Teams: ${totalTeams}`, font: 'Calibri' })],
        spacing: { after: 100 }
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Total Participants: ${totalParticipants}`, font: 'Calibri' })],
        spacing: { after: 100 }
      })
    );

    // Create document
    const doc = new Document({
      sections: [
        {
          children: children
        }
      ]
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Return the file
    const fileName = `endlist-${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.docx`;
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error("Error generating DOCX:", error);
    return NextResponse.json(
      { error: "Failed to generate DOCX file" },
      { status: 500 }
    );
  }
}
