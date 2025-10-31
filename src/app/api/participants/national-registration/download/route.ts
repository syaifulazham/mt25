import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, HeadingLevel, BorderStyle, Header, Footer, PageNumber } from "docx";

export const dynamic = 'force-dynamic';

const db = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get participantId from query params
    const url = new URL(req.url);
    const participantId = url.searchParams.get("participantId");

    if (!participantId) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    // First, find all contingents that this participant belongs to
    const participantContingents = await db.contingentManager.findMany({
      where: {
        participantId: parseInt(participantId)
      },
      select: {
        contingentId: true
      }
    });

    const contingentIds = participantContingents.map(cm => cm.contingentId);
    
    // If no contingent IDs found, return error early
    if (contingentIds.length === 0) {
      return NextResponse.json({ 
        error: "No contingents found for this participant" 
      }, { status: 404 });
    }

    // Use raw SQL query to get NATIONAL teams directly (same approach as the main API)
    const teams = await db.$queryRaw`
      SELECT 
        t.id,
        t.name,
        t.contestId,
        c.id as contestId,
        c.name as contestName,
        c.code as contestCode,
        c.minAge,
        c.maxAge,
        ect.status as teamStatus
      FROM team t
      JOIN contest c ON t.contestId = c.id
      JOIN eventcontest ec ON c.id = ec.contestId
      JOIN event e ON ec.eventId = e.id
      JOIN eventcontestteam ect ON ec.id = ect.eventcontestId AND ect.teamId = t.id
      WHERE t.contingentId IN (${contingentIds.join(',')})
        AND e.scopeArea = 'NATIONAL'
        AND t.status = 'ACTIVE'
      ORDER BY c.code, t.name
    ` as any[];

    // If no teams found, return error  
    if (!teams || teams.length === 0) {
      return NextResponse.json({ 
        error: "No national teams found",
        debug: {
          participantId,
          contingentIds
        }
      }, { status: 404 });
    }

    // Use all teams regardless of status
    if (teams.length === 0) {
      return NextResponse.json({ error: "No national teams found" }, { status: 404 });
    }

    // Get team IDs to fetch members and managers
    const teamIds = teams.map((t: any) => t.id);

    // Fetch team members
    const members = await db.teamMember.findMany({
      where: {
        teamId: { in: teamIds }
      },
      include: {
        contestant: {
          select: {
            id: true,
            name: true,
            age: true,
            class_grade: true,
            edu_level: true,
            ic: true
          }
        }
      }
    });

    // Fetch managers
    const managers = await db.manager_team.findMany({
      where: {
        teamId: { in: teamIds }
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            ic: true
          }
        }
      }
    });

    // Attach members and managers to teams
    teams.forEach((team: any) => {
      team.members = members.filter((m: any) => m.teamId === team.id);
      team.managerTeams = managers.filter((m: any) => m.teamId === team.id);
      team.independentManagers = []; // Not using this for now
    });

    // Get contingent name for title
    let contingentName = "Unknown Contingent";
    if (contingentIds.length > 0) {
      const contingent = await db.contingent.findFirst({
        where: { id: { in: contingentIds } },
        include: {
          school: { select: { name: true } },
          higherInstitution: { select: { name: true } },
          independent: { select: { name: true } }
        }
      });
      
      if (contingent) {
        contingentName = contingent.school?.name || 
                        contingent.higherInstitution?.name || 
                        contingent.independent?.name || 
                        "Unknown Contingent";
      }
    }

    // Group teams by contest
    const teamsByContest: { [key: string]: any[] } = {};
    teams.forEach((team: any) => {
      const contestName = `${team.contestCode} - ${team.contestName}`;
      if (!teamsByContest[contestName]) {
        teamsByContest[contestName] = [];
      }
      teamsByContest[contestName].push(team);
    });

    // Calculate totals from all teams
    const totalTeams = teams.length;
    const totalMembers = teams.reduce((sum: number, team: any) => sum + (team.members?.length || 0), 0);
    
    // Get all unique managers from teams
    const managerMap = new Map<number, any>();
    teams.forEach((team: any) => {
      // Add manager team managers
      (team.managerTeams || []).forEach((mt: any) => {
        if (mt.manager) {
          const existingManager = managerMap.get(mt.manager.id);
          if (existingManager) {
            existingManager.contests.add(`${team.contestCode} - ${team.contestName}`);
          } else {
            managerMap.set(mt.manager.id, {
              ...mt.manager,
              contests: new Set([`${team.contestCode} - ${team.contestName}`])
            });
          }
        }
      });
      
      // Add independent managers
      (team.independentManagers || []).forEach((manager: any) => {
        const existingManager = managerMap.get(manager.id);
        if (existingManager) {
          existingManager.contests.add(`${team.contestCode} - ${team.contestName}`);
        } else {
          managerMap.set(manager.id, {
            ...manager,
            contests: new Set([`${team.contestCode} - ${team.contestName}`])
          });
        }
      });
    });
    
    const totalManagers = managerMap.size;

    // Create DOCX document with Calibri font
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
              size: 22, // 11pt
            },
          },
        },
      },
      title: "Pendaftaran Peringkat Akhir (Kebangsaan) Malaysia Techlympics 2025",
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 inch
                bottom: 1440, // 1 inch
                left: 1440,   // 1 inch
                right: 1440,  // 1 inch
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Malaysia Techlympics 2025 - Peringkat Kebangsaan | ",
                      bold: true,
                      size: 20,
                      font: "Calibri"
                    }),
                    new TextRun({
                      text: "Tarikh: 15 Ogos 2025 - 20 Ogos 2025",
                      size: 20,
                      font: "Calibri"
                    })
                  ],
                  alignment: AlignmentType.RIGHT,
                })
              ]
            })
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Muka ",
                      size: 20,
                      font: "Calibri"
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 20,
                      font: "Calibri"
                    }),
                    new TextRun({
                      text: " daripada ",
                      size: 20,
                      font: "Calibri"
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      size: 20,
                      font: "Calibri"
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                })
              ]
            })
          },
          children: [
            // Title
            new Paragraph({
              text: "SENARAI PENDAFTARAN PERINGKAT AKHIR (KEBANGSAAN)",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              run: {
                bold: true,
                size: 28,
                font: "Calibri"
              }
            }),
            new Paragraph({
              text: "Malaysia Techlympics 2025",
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
              run: {
                size: 24,
                font: "Calibri"
              }
            }),

            // Contingent Info
            new Paragraph({
              children: [
                new TextRun({
                  text: "Kontijen: ",
                  bold: true,
                  size: 24,
                  font: "Calibri"
                }),
                new TextRun({
                  text: contingentName,
                  size: 24,
                  font: "Calibri"
                })
              ],
              spacing: { after: 200 }
            }),

            // Summary Statistics
            new Paragraph({
              children: [
                new TextRun({
                  text: "Ringkasan: ",
                  bold: true,
                  size: 22,
                  font: "Calibri"
                }),
                new TextRun({
                  text: `${totalTeams} Pasukan | ${totalMembers} Peserta | ${totalManagers} Jurulatih`,
                  size: 22,
                  font: "Calibri"
                })
              ],
              spacing: { after: 400 }
            }),

            // Teams by Contest
            ...Object.entries(teamsByContest).flatMap(([contestName, contestTeams]) => [
              new Paragraph({
                text: contestName,
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 300, after: 200 },
                run: {
                  bold: true,
                  size: 24,
                  font: "Calibri"
                }
              }),
              ...contestTeams.flatMap((team: any, teamIndex: number) => [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Pasukan ${teamIndex + 1}: ${team.name}`,
                      bold: true,
                      size: 22,
                      font: "Calibri"
                    })
                  ],
                  spacing: { before: 200, after: 100 }
                }),
                
                // Members Table
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    // Header row
                    new TableRow({
                      tableHeader: true,
                      children: [
                        new TableCell({
                          children: [new Paragraph({ 
                            text: "Bil", 
                            alignment: AlignmentType.CENTER,
                            run: { bold: true, size: 20, font: "Calibri" }
                          })],
                          shading: { fill: "D3D3D3" },
                          width: { size: 8, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                          children: [new Paragraph({ 
                            text: "Nama Peserta", 
                            run: { bold: true, size: 20, font: "Calibri" }
                          })],
                          shading: { fill: "D3D3D3" },
                          width: { size: 35, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                          children: [new Paragraph({ 
                            text: "No. K/P", 
                            alignment: AlignmentType.CENTER,
                            run: { bold: true, size: 20, font: "Calibri" }
                          })],
                          shading: { fill: "D3D3D3" },
                          width: { size: 20, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                          children: [new Paragraph({ 
                            text: "Umur", 
                            alignment: AlignmentType.CENTER,
                            run: { bold: true, size: 20, font: "Calibri" }
                          })],
                          shading: { fill: "D3D3D3" },
                          width: { size: 8, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                          children: [new Paragraph({ 
                            text: "Darjah/Tingkatan", 
                            alignment: AlignmentType.CENTER,
                            run: { bold: true, size: 20, font: "Calibri" }
                          })],
                          shading: { fill: "D3D3D3" },
                          width: { size: 15, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                          children: [new Paragraph({ 
                            text: "Tahap Pendidikan", 
                            alignment: AlignmentType.CENTER,
                            run: { bold: true, size: 20, font: "Calibri" }
                          })],
                          shading: { fill: "D3D3D3" },
                          width: { size: 14, type: WidthType.PERCENTAGE }
                        })
                      ]
                    }),
                    // Member rows
                    ...team.members.map((member: any, memberIndex: number) => 
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [new Paragraph({ 
                              text: String(memberIndex + 1),
                              alignment: AlignmentType.CENTER,
                              run: { size: 20, font: "Calibri" }
                            })],
                            width: { size: 8, type: WidthType.PERCENTAGE }
                          }),
                          new TableCell({
                            children: [new Paragraph({ 
                              text: member.contestant.name,
                              run: { size: 20, font: "Calibri" }
                            })],
                            width: { size: 35, type: WidthType.PERCENTAGE }
                          }),
                          new TableCell({
                            children: [new Paragraph({ 
                              text: member.contestant.ic || '-',
                              alignment: AlignmentType.CENTER,
                              run: { size: 20, font: "Calibri" }
                            })],
                            width: { size: 20, type: WidthType.PERCENTAGE }
                          }),
                          new TableCell({
                            children: [new Paragraph({ 
                              text: String(member.contestant.age || '-'),
                              alignment: AlignmentType.CENTER,
                              run: { size: 20, font: "Calibri" }
                            })],
                            width: { size: 8, type: WidthType.PERCENTAGE }
                          }),
                          new TableCell({
                            children: [new Paragraph({ 
                              text: member.contestant.class_grade || '-',
                              alignment: AlignmentType.CENTER,
                              run: { size: 20, font: "Calibri" }
                            })],
                            width: { size: 15, type: WidthType.PERCENTAGE }
                          }),
                          new TableCell({
                            children: [new Paragraph({ 
                              text: member.contestant.edu_level || '-',
                              alignment: AlignmentType.CENTER,
                              run: { size: 20, font: "Calibri" }
                            })],
                            width: { size: 14, type: WidthType.PERCENTAGE }
                          })
                        ]
                      })
                    )
                  ]
                }),

                // Managers/Trainers
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Jurulatih: ",
                      bold: true,
                      size: 20,
                      font: "Calibri"
                    }),
                    new TextRun({
                      text: [
                        ...team.managerTeams.map((mt: any) => `${mt.manager.name} (${mt.manager.phoneNumber || 'No Phone'})`),
                        ...team.independentManagers.map((m: any) => `${m.name} (${m.phoneNumber || 'No Phone'})`)
                      ].join(', ') || 'Tiada',
                      size: 20,
                      font: "Calibri"
                    })
                  ],
                  spacing: { before: 100, after: 300 }
                })
              ])
            ]),

            // Managers Summary Section
            new Paragraph({
              text: "SENARAI JURULATIH",
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 600, after: 200 },
              run: {
                bold: true,
                size: 24,
                font: "Calibri"
              }
            }),

            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                // Header row
                new TableRow({
                  tableHeader: true,
                  children: [
                    new TableCell({
                      children: [new Paragraph({ 
                        text: "Bil", 
                        alignment: AlignmentType.CENTER,
                        run: { bold: true, size: 20, font: "Calibri" }
                      })],
                      shading: { fill: "D3D3D3" },
                      width: { size: 8, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: "Nama Jurulatih", 
                        run: { bold: true, size: 20, font: "Calibri" }
                      })],
                      shading: { fill: "D3D3D3" },
                      width: { size: 30, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: "No. K/P", 
                        alignment: AlignmentType.CENTER,
                        run: { bold: true, size: 20, font: "Calibri" }
                      })],
                      shading: { fill: "D3D3D3" },
                      width: { size: 20, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: "No. Telefon", 
                        alignment: AlignmentType.CENTER,
                        run: { bold: true, size: 20, font: "Calibri" }
                      })],
                      shading: { fill: "D3D3D3" },
                      width: { size: 17, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: "Pertandingan", 
                        run: { bold: true, size: 20, font: "Calibri" }
                      })],
                      shading: { fill: "D3D3D3" },
                      width: { size: 25, type: WidthType.PERCENTAGE }
                    })
                  ]
                }),
                // Manager rows
                ...Array.from(managerMap.values()).map((manager: any, index: number) => 
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ 
                          text: String(index + 1),
                          alignment: AlignmentType.CENTER,
                          run: { size: 20, font: "Calibri" }
                        })],
                        width: { size: 8, type: WidthType.PERCENTAGE }
                      }),
                      new TableCell({
                        children: [new Paragraph({ 
                          text: manager.name,
                          run: { size: 20, font: "Calibri" }
                        })],
                        width: { size: 30, type: WidthType.PERCENTAGE }
                      }),
                      new TableCell({
                        children: [new Paragraph({ 
                          text: manager.ic || '-',
                          alignment: AlignmentType.CENTER,
                          run: { size: 20, font: "Calibri" }
                        })],
                        width: { size: 20, type: WidthType.PERCENTAGE }
                      }),
                      new TableCell({
                        children: [new Paragraph({ 
                          text: manager.phoneNumber || '-',
                          alignment: AlignmentType.CENTER,
                          run: { size: 20, font: "Calibri" }
                        })],
                        width: { size: 17, type: WidthType.PERCENTAGE }
                      }),
                      new TableCell({
                        children: [new Paragraph({ 
                          text: Array.from(manager.contests).join(', '),
                          run: { size: 18, font: "Calibri" }
                        })],
                        width: { size: 25, type: WidthType.PERCENTAGE }
                      })
                    ]
                  })
                )
              ]
            })
          ]
        }
      ]
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Return the file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="national-registration-list-${contingentName.replace(/\s+/g, '-')}.docx"`
      }
    });

  } catch (error) {
    console.error("Error generating national registration document:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}
