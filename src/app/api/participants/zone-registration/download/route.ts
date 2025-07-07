import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, HeadingLevel, BorderStyle, Header, Footer, PageNumber } from "docx";

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
    
    let teams: any[];

    if (contingentIds.length === 0) {
      // Fallback to directly managed teams if no contingent relationship found
      teams = await db.team.findMany({
        where: {
          managers: {
            some: {
              participantId: parseInt(participantId)
            }
          },
          eventcontestteam: {
            some: {}
          }
        },
        include: {
          contest: {
            include: {
              targetgroup: true
            }
          },
          eventcontestteam: true,
          members: {
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
          },
          managerTeams: {
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
          },
          independentManagers: {
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
    } else {
      // Get all teams for this participant's contingents
      teams = await db.team.findMany({
        where: {
          contingentId: {
            in: contingentIds
          },
          eventcontestteam: {
            some: {}
          }
        },
        include: {
          contest: {
            include: {
              targetgroup: true
            }
          },
          eventcontestteam: true,
          members: {
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
          },
          managerTeams: {
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
          },
          independentManagers: {
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
    }

    // If no teams found, return error  
    if (!teams || teams.length === 0) {
      return NextResponse.json({ error: "No teams found" }, { status: 404 });
    }

    // Filter teams by approved statuses only
    const approvedTeams = teams.filter((team: any) => {
      const status = team.eventcontestteam?.[0]?.status;
      return status === 'APPROVED' || status === 'APPROVED_SPECIAL' || status === 'ACCEPTED';
    });

    if (approvedTeams.length === 0) {
      return NextResponse.json({ error: "No approved teams found" }, { status: 404 });
    }

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

    // Group approved teams by contest
    const teamsByContest: { [key: string]: any[] } = {};
    approvedTeams.forEach((team: any) => {
      const contestName = `${team.contest.code} - ${team.contest.name}`;
      if (!teamsByContest[contestName]) {
        teamsByContest[contestName] = [];
      }
      teamsByContest[contestName].push(team);
    });

    // Calculate totals from approved teams
    const totalTeams = approvedTeams.length;
    const totalMembers = approvedTeams.reduce((sum: number, team: any) => sum + (team.members?.length || 0), 0);
    
    // Get all unique managers from approved teams
    const managerMap = new Map<number, any>();
    approvedTeams.forEach((team: any) => {
      // Add manager team managers
      (team.managerTeams || []).forEach((mt: any) => {
        if (mt.manager) {
          const existingManager = managerMap.get(mt.manager.id);
          if (existingManager) {
            existingManager.contests.add(`${team.contest.code} - ${team.contest.name}`);
          } else {
            managerMap.set(mt.manager.id, {
              ...mt.manager,
              contests: new Set([`${team.contest.code} - ${team.contest.name}`])
            });
          }
        }
      });
      
      // Add independent managers
      (team.independentManagers || []).forEach((manager: any) => {
        const existingManager = managerMap.get(manager.id);
        if (existingManager) {
          existingManager.contests.add(`${team.contest.code} - ${team.contest.name}`);
        } else {
          managerMap.set(manager.id, {
            ...manager,
            contests: new Set([`${team.contest.code} - ${team.contest.name}`])
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
      title: "Pendaftaran Pertandingan Malaysia Techlympics 2025",
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
                      text: "Malaysia Techlympics 2025 | ",
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
                      font: "Calibri"
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: "Calibri"
                    }),
                    new TextRun({
                      text: " / ",
                      font: "Calibri"
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      font: "Calibri"
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                })
              ]
            })
          },
          children: [
            // Title - Contingent Name
            new Paragraph({
              children: [
                new TextRun({ 
                  text: contingentName, 
                  bold: true, 
                  size: 32, // 16pt
                  font: "Calibri" 
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 }, // Space after
            }),

            // Subtitle
            new Paragraph({
              children: [
                new TextRun({ 
                  text: "Pendaftaran Pertandingan Malaysia Techlympics 2025", 
                  bold: true, 
                  size: 28, // 14pt
                  font: "Calibri" 
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 480 }, // Space after
            }),

            // Summary Section
            new Paragraph({
              children: [
                new TextRun({ 
                  text: "Ringkasan", 
                  bold: true, 
                  size: 24, // 12pt
                  font: "Calibri" 
                }),
              ],
              spacing: { before: 240, after: 120 },
            }),
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: "Jumlah Pasukan", bold: true, font: "Calibri" })], 
                        alignment: AlignmentType.LEFT 
                      })],
                      width: { size: 70, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: totalTeams.toString(), font: "Calibri" })], 
                        alignment: AlignmentType.CENTER 
                      })],
                      width: { size: 30, type: WidthType.PERCENTAGE },
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: "Jumlah Peserta", bold: true, font: "Calibri" })], 
                        alignment: AlignmentType.LEFT 
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: totalMembers.toString(), font: "Calibri" })], 
                        alignment: AlignmentType.CENTER 
                      })],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: "Jumlah Pengurus", bold: true, font: "Calibri" })], 
                        alignment: AlignmentType.LEFT 
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: totalManagers.toString(), font: "Calibri" })], 
                        alignment: AlignmentType.CENTER 
                      })],
                    }),
                  ],
                }),
              ],
            }),
            
            // Teams by Contest
            ...Object.entries(teamsByContest).flatMap(([contestName, contestTeams]) => [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: contestName, 
                    bold: true, 
                    size: 24, // 12pt
                    font: "Calibri" 
                  }),
                ],
                spacing: { before: 480, after: 120 },
              }),
              ...contestTeams.flatMap((team: any) => {
                const teamManagers: string[] = [];
                
                // Get managers for this team
                (team.managerTeams || []).forEach((mt: any) => {
                  if (mt.manager) {
                    teamManagers.push(mt.manager.name || 'Unknown');
                  }
                });
                
                (team.independentManagers || []).forEach((manager: any) => {
                  teamManagers.push(manager.name || 'Unknown');
                });

                return [
                  // Team Section Header
                  new Paragraph({
                    children: [
                      new TextRun({ 
                        text: team.name, 
                        bold: true, 
                        size: 22, // 11pt
                        font: "Calibri",
                        highlight: "lightGray",
                        shading: {
                          fill: "D3D3D3",
                          color: "auto"
                        }
                      }),
                    ],
                    spacing: { before: 360, after: 120 },
                    border: {
                      top: { style: BorderStyle.SINGLE, size: 6, color: "808080" },
                      bottom: { style: BorderStyle.SINGLE, size: 6, color: "808080" },
                      left: { style: BorderStyle.SINGLE, size: 6, color: "808080" },
                      right: { style: BorderStyle.SINGLE, size: 6, color: "808080" },
                    },
                    shading: {
                      fill: "D3D3D3",
                      color: "auto"
                    }
                  }),
                  
                  // Managers Table
                  new Paragraph({
                    children: [
                      new TextRun({ 
                        text: "Pengurus/Jurulatih", 
                        bold: true, 
                        font: "Calibri" 
                      }),
                    ],
                    spacing: { after: 60 },
                  }),
                  new Table({
                    width: {
                      size: 100,
                      type: WidthType.PERCENTAGE,
                    },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
                      bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
                      insideVertical: { style: BorderStyle.NONE },
                    },
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [new Paragraph({ 
                              children: [new TextRun({ text: "Nama", bold: true, font: "Calibri" })], 
                              alignment: AlignmentType.LEFT 
                            })],
                            width: { size: 40, type: WidthType.PERCENTAGE },
                          }),
                          new TableCell({
                            children: [new Paragraph({ 
                              children: [new TextRun({ text: "No. IC", bold: true, font: "Calibri" })], 
                              alignment: AlignmentType.CENTER 
                            })],
                            width: { size: 20, type: WidthType.PERCENTAGE },
                          }),
                          new TableCell({
                            children: [new Paragraph({ 
                              children: [new TextRun({ text: "No. Telefon", bold: true, font: "Calibri" })], 
                              alignment: AlignmentType.CENTER 
                            })],
                            width: { size: 20, type: WidthType.PERCENTAGE },
                          }),
                          new TableCell({
                            children: [new Paragraph({ 
                              children: [new TextRun({ text: "Emel", bold: true, font: "Calibri" })], 
                              alignment: AlignmentType.CENTER 
                            })],
                            width: { size: 20, type: WidthType.PERCENTAGE },
                          }),
                        ],
                      }),
                      ...teamManagers.map(managerName => {
                        const manager = Array.from(managerMap.values()).find(m => m.name === managerName) || {};
                        return new TableRow({
                          children: [
                            new TableCell({
                              children: [new Paragraph({ 
                                children: [new TextRun({ text: managerName, font: "Calibri" })]
                              })],
                            }),
                            new TableCell({
                              children: [new Paragraph({ 
                                children: [new TextRun({ text: manager.ic || 'N/A', font: "Calibri" })],
                                alignment: AlignmentType.CENTER
                              })],
                            }),
                            new TableCell({
                              children: [new Paragraph({ 
                                children: [new TextRun({ text: manager.phoneNumber || 'N/A', font: "Calibri" })],
                                alignment: AlignmentType.CENTER
                              })],
                            }),
                            new TableCell({
                              children: [new Paragraph({ 
                                children: [new TextRun({ text: manager.email || 'N/A', font: "Calibri" })],
                                alignment: AlignmentType.CENTER
                              })],
                            }),
                          ],
                        });
                      }),
                    ],
                  }),
                  
                  // Members Table
                  new Paragraph({
                    children: [
                      new TextRun({ 
                        text: "Ahli Pasukan", 
                        bold: true, 
                        font: "Calibri" 
                      }),
                    ],
                    spacing: { before: 240, after: 60 },
                  }),
                  new Table({
                    width: {
                      size: 100,
                      type: WidthType.PERCENTAGE,
                    },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
                      bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
                      insideVertical: { style: BorderStyle.NONE },
                    },
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [new Paragraph({ 
                              children: [new TextRun({ text: "Nama", bold: true, font: "Calibri" })], 
                              alignment: AlignmentType.LEFT 
                            })],
                            width: { size: 30, type: WidthType.PERCENTAGE },
                          }),
                          new TableCell({
                            children: [new Paragraph({ 
                              children: [new TextRun({ text: "Umur", bold: true, font: "Calibri" })], 
                              alignment: AlignmentType.CENTER 
                            })],
                            width: { size: 10, type: WidthType.PERCENTAGE },
                          }),
                          new TableCell({
                            children: [new Paragraph({ 
                              children: [new TextRun({ text: "Kelas", bold: true, font: "Calibri" })], 
                              alignment: AlignmentType.CENTER 
                            })],
                            width: { size: 20, type: WidthType.PERCENTAGE },
                          }),
                        ],
                      }),
                      ...(team.members || []).map((member: any) => {
                        let kelasLabel = '';
                        const eduLevel = member.contestant.edu_level?.toLowerCase() || '';
                        const classGrade = member.contestant.class_grade;
                        
                        if (eduLevel === 'sekolah rendah' && classGrade) {
                          kelasLabel = `Darjah ${classGrade}`;
                        } else if (eduLevel === 'sekolah menengah' && classGrade) {
                          kelasLabel = `Tingkatan ${classGrade}`;
                        } else if (eduLevel === 'ppki' && classGrade) {
                          kelasLabel = classGrade; // No prefix for PPKI
                        } else if (classGrade) {
                          kelasLabel = classGrade; // Fallback for other cases
                        } else {
                          kelasLabel = ''; // Empty if no class grade
                        }

                        return new TableRow({
                          children: [
                            new TableCell({
                              children: [new Paragraph({ 
                                children: [new TextRun({ 
                                  text: member.contestant.name, 
                                  font: "Calibri" 
                                })]
                              })],
                            }),
                            new TableCell({
                              children: [new Paragraph({ 
                                children: [new TextRun({ 
                                  text: member.contestant.age?.toString() || 'N/A', 
                                  font: "Calibri" 
                                })],
                                alignment: AlignmentType.CENTER
                              })],
                            }),
                            new TableCell({
                              children: [new Paragraph({ 
                                children: [new TextRun({ 
                                  text: kelasLabel, 
                                  font: "Calibri" 
                                })],
                                alignment: AlignmentType.CENTER
                              })],
                            }),
                          ],
                        });
                      }),
                    ],
                  }),
                ];
              }),
            ]),
          ],
        },
      ],
    });

    // Generate the document buffer
    const buffer = await Packer.toBuffer(doc);

    // Return the DOCX file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="zone-registration-list.docx"',
      },
    });

  } catch (error) {
    console.error("Error generating DOCX:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}
