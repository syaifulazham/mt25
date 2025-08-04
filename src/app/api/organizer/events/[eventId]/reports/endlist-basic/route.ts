import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRequiredRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, HeadingLevel } from "docx";

interface TeamMember {
  id: number;
  participantName: string;
  edu_level: string | null;
  class_grade: string | null;
  age: number | null;
  formattedClassGrade: string;
}

interface Manager {
  id: number;
  name: string;
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

    // Fetch team members for each team using the exact same logic as main endlist API
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
        ` as TeamMember[];

        return {
          ...team,
          members: members || []
        };
      })
    );

    // Filter out teams where any member's age doesn't match target group age range
    // unless the team status is 'APPROVED_SPECIAL' (same logic as main endlist API)
    const filteredTeams = teamsWithMembers.filter((team) => {
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



    // Process teams with formatted registration dates
    const processedTeams: Team[] = filteredTeams.map((team: any) => ({
      ...team,
      members: team.members,
      registrationDate: new Date(team.registrationDate).toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }));

    // Fetch managers for the teams (same logic as Full Endlist Report)
    const teamIds = processedTeams.map(team => team.id);
    
    // Get managers associated with these teams
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
    
    // Create a map of team ID to team name and contest names
    const teamContestsMap: Record<number, { teamName: string; contestNames: string[] }> = {};
    eventContestTeams.forEach(ect => {
      if (!teamContestsMap[ect.teamId]) {
        teamContestsMap[ect.teamId] = {
          teamName: ect.team.name,
          contestNames: []
        };
      }
      teamContestsMap[ect.teamId].contestNames.push(ect.eventcontest.contest.name);
    });
    
    // Transform the results to match our Manager interface (without IC, phone, email)
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
          teamId: managedTeamIds[0], // Just use the first team ID for reference
          teamName: uniqueTeamNames.join(", "),
          contestName: uniqueContestNames.join(", ")
        });
      }
    });
    
    // Group managers by contingent (same logic as Full Endlist Report)
    const managersByContingent = processedTeams.reduce((acc: Record<string, Manager[]>, team: Team) => {
      const contingent = team.contingentName || 'Unknown Contingent';
      
      // Find managers for this team
      const teamManagers = transformedManagers.filter(m => m.teamId === team.id);
      
      teamManagers.forEach(manager => {
        if (!acc[contingent]) {
          acc[contingent] = [];
        }
        // Check if manager already exists for this contingent
        const existingManager = acc[contingent].find(m => m.id === manager.id);
        if (existingManager && existingManager.teamName !== manager.teamName) {
          existingManager.teamName += `, ${manager.teamName}`;
          existingManager.contestName += `, ${manager.contestName}`;
        } else if (!existingManager) {
          acc[contingent].push(manager);
        }
      });
      
      return acc;
    }, {} as Record<string, Manager[]>);

    // Group teams by target group, state, PPD, and contingent
    const groupedTeams: Record<string, Record<string, Record<string, Record<string, Team[]>>>> = {};
    
    processedTeams.forEach(team => {
      const targetGroup = team.targetGroupLabel || 'Other';
      const state = team.stateName || 'Unknown State';
      const ppd = team.ppd || 'Unknown PPD';
      const contingent = team.contingentName || 'Unknown Contingent';
      
      if (!groupedTeams[targetGroup]) groupedTeams[targetGroup] = {};
      if (!groupedTeams[targetGroup][state]) groupedTeams[targetGroup][state] = {};
      if (!groupedTeams[targetGroup][state][ppd]) groupedTeams[targetGroup][state][ppd] = {};
      if (!groupedTeams[targetGroup][state][ppd][contingent]) groupedTeams[targetGroup][state][ppd][contingent] = [];
      
      groupedTeams[targetGroup][state][ppd][contingent].push(team);
    });

    // Create document content
    const children = [];
    
    // Title
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${event.name} - Basic Endlist Report`, bold: true, size: 32, font: 'Calibri' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Generated date
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Generated on: ${new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' })}`, font: 'Calibri' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      })
    );

    let teamCounter = 1;

    // Process each target group
    Object.keys(groupedTeams).sort().forEach(targetGroup => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: targetGroup, bold: true, size: 28, font: 'Calibri' })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 600, after: 300 }
        })
      );

      Object.keys(groupedTeams[targetGroup]).sort().forEach(state => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: state, bold: true, size: 24, font: 'Calibri' })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          })
        );

        Object.keys(groupedTeams[targetGroup][state]).sort().forEach(ppd => {
          if (ppd !== 'Unknown PPD') {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: ppd, bold: true, size: 20, font: 'Calibri' })],
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 300, after: 150 }
              })
            );
          }

          Object.keys(groupedTeams[targetGroup][state][ppd]).sort().forEach(contingent => {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: contingent, bold: true, size: 18, font: 'Calibri' })],
                heading: HeadingLevel.HEADING_4,
                spacing: { before: 200, after: 100 }
              })
            );

            groupedTeams[targetGroup][state][ppd][contingent].forEach((team: Team) => {
              // Team header
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: `${teamCounter}. ${team.teamName}`, bold: true, size: 16, font: 'Calibri' })],
                  spacing: { before: 200, after: 100 }
                })
              );

              // Team info
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: `Registration Date: ${team.registrationDate}`, font: 'Calibri' })],
                  spacing: { after: 100 }
                })
              );

              // Members table (without IC, phone, email)
              const memberTableRows = [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No.", bold: true, font: 'Calibri' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Name", bold: true, font: 'Calibri' })] })] }),
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
            
            // Add Managers Table if there are managers for this contingent
            if (managersByContingent[contingent] && managersByContingent[contingent].length > 0) {
              // Add Managers header
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: "Managers", bold: true, font: 'Calibri' })],
                  spacing: { before: 100, after: 50 }
                })
              );
              
              // Create managers table (without IC, phone, email columns)
              const managerTableRows = [
                new TableRow({
                  children: [
                    new TableCell({ 
                      children: [new Paragraph({ children: [new TextRun({ text: "Name", bold: true , font: 'Calibri'})] })],
                      shading: { fill: "E6E6E6" }
                    }),
                    new TableCell({ 
                      children: [new Paragraph({ children: [new TextRun({ text: "Teams/Contests", bold: true , font: 'Calibri'})] })],
                      shading: { fill: "E6E6E6" }
                    })
                  ]
                })
              ];
              
              managersByContingent[contingent].forEach((manager: Manager) => {
                managerTableRows.push(
                  new TableRow({
                    children: [
                      new TableCell({ 
                        children: [new Paragraph({ children: [new TextRun({ text: manager.name, font: 'Calibri' })] })],
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
          });
        });
      });
    });

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

    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Note: This report excludes personal contact information (IC, phone, email) for privacy protection.", italics: true, font: 'Calibri' })],
        spacing: { before: 200, after: 100 }
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
    const fileName = `endlist-basic-${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.docx`;
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error("Error generating basic endlist DOCX:", error);
    return NextResponse.json(
      { error: "Failed to generate basic endlist DOCX file" },
      { status: 500 }
    );
  }
}
