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
  isDuplicate: boolean;
  duplicateTeams: string[];
}

interface Team {
  id: number;
  teamName: string;
  contestName: string;
  status: string;
  registrationDate: string;
  contingentName: string;
  contingentType: string;
  schoolLevel: string;
  targetGroupLabel: string;
  stateName: string;
  minAge: number | null;
  maxAge: number | null;
  members: TeamMember[];
  hasDuplicateMembers: boolean;
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

    // Fetch ALL teams without any status filtering (show everything) - same as rawlist
    const teams = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.name as teamName,
        ct.name as contestName,
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
      ORDER BY tg.schoolLevel, st_s.name, st_hi.name, st_i.name, c.name, t.name ASC
    ` as any[];

    // Fetch team members for each team
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await prisma.$queryRaw`
          SELECT 
            con.id,
            con.name as participantName,
            con.email,
            con.ic,
            con.edu_level,
            con.class_grade,
            con.age,
            tm.joinedAt,
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
        ` as any[];

        return {
          ...team,
          members: members || []
        };
      })
    );

    // Detect duplicate members across teams
    const memberTeamMap = new Map<string, string[]>(); // ic -> team names
    const duplicateMembers = new Set<string>(); // ic of duplicate members
    
    teamsWithMembers.forEach(team => {
      team.members.forEach((member: any) => {
        if (member.ic) {
          if (!memberTeamMap.has(member.ic)) {
            memberTeamMap.set(member.ic, []);
          }
          memberTeamMap.get(member.ic)!.push(team.teamName);
          
          // If this member belongs to more than one team, mark as duplicate
          if (memberTeamMap.get(member.ic)!.length > 1) {
            duplicateMembers.add(member.ic);
          }
        }
      });
    });

    // Add duplicate information to teams and members
    const teamsWithDuplicateInfo = teamsWithMembers.map(team => {
      const membersWithDuplicateInfo = team.members.map((member: any) => ({
        ...member,
        isDuplicate: member.ic ? duplicateMembers.has(member.ic) : false,
        duplicateTeams: member.ic ? memberTeamMap.get(member.ic) || [] : []
      }));
      
      const hasDuplicateMembers = membersWithDuplicateInfo.some((member: any) => member.isDuplicate);
      
      return {
        ...team,
        members: membersWithDuplicateInfo,
        hasDuplicateMembers
      };
    });

    // Create Word document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: `Raw List - ${event.name}`,
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Date info
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on: ${new Date().toLocaleDateString('en-MY', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}`,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),

          // Summary
          new Paragraph({
            children: [
              new TextRun({
                text: `Total Teams: ${teamsWithDuplicateInfo.length}`,
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Teams with duplicate members warning
          ...(teamsWithDuplicateInfo.some(team => team.hasDuplicateMembers) ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: "⚠️ Teams with Duplicate Members:",
                  bold: true,
                  color: "FF0000",
                  size: 24,
                }),
              ],
              spacing: { after: 200 },
            }),
            ...teamsWithDuplicateInfo
              .filter(team => team.hasDuplicateMembers)
              .map(team => new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${team.teamName} (${team.contestName})`,
                    color: "FF0000",
                    size: 20,
                  }),
                ],
                spacing: { after: 100 },
              })),
            new Paragraph({
              children: [new TextRun({ text: "", size: 20 })],
              spacing: { after: 400 },
            }),
          ] : []),

          // Teams table
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
                    children: [new Paragraph({
                      children: [new TextRun({ text: "No.", bold: true, size: 20 })],
                      alignment: AlignmentType.CENTER,
                    })],
                    width: { size: 8, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 },
                    },
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Team Name", bold: true, size: 20 })],
                      alignment: AlignmentType.CENTER,
                    })],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 },
                    },
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Contest", bold: true, size: 20 })],
                      alignment: AlignmentType.CENTER,
                    })],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 },
                    },
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Status", bold: true, size: 20 })],
                      alignment: AlignmentType.CENTER,
                    })],
                    width: { size: 12, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 },
                    },
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Contingent", bold: true, size: 20 })],
                      alignment: AlignmentType.CENTER,
                    })],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 },
                    },
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Members", bold: true, size: 20 })],
                      alignment: AlignmentType.CENTER,
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 },
                    },
                  }),
                ],
              }),
              // Data rows
              ...teamsWithDuplicateInfo.map((team, index) => 
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: (index + 1).toString(), size: 18 })],
                        alignment: AlignmentType.CENTER,
                      })],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [
                          new TextRun({ 
                            text: team.teamName, 
                            size: 18,
                            color: team.hasDuplicateMembers ? "FF0000" : "000000",
                            bold: team.hasDuplicateMembers
                          })
                        ],
                      })],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: team.contestName, size: 18 })],
                      })],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ 
                          text: team.status, 
                          size: 18,
                          color: team.status === 'ACCEPTED' ? '008000' : 
                                team.status === 'APPROVED' ? '0066CC' :
                                team.status === 'PENDING' ? 'FF8800' : '000000'
                        })],
                        alignment: AlignmentType.CENTER,
                      })],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ 
                          text: `${team.contingentName} (${team.stateName})`, 
                          size: 18 
                        })],
                      })],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                    }),
                    new TableCell({
                      children: team.members.length > 0 ? team.members.map((member, memberIndex) => 
                        new Paragraph({
                          children: [
                            new TextRun({ 
                              text: `${memberIndex + 1}. ${member.participantName}`, 
                              size: 16,
                              color: member.isDuplicate ? "FF0000" : "000000",
                              bold: member.isDuplicate
                            }),
                            ...(member.isDuplicate ? [
                              new TextRun({ 
                                text: ` (DUPLICATE)`, 
                                size: 14,
                                color: "FF0000",
                                bold: true
                              })
                            ] : []),
                          ],
                          spacing: { after: 100 },
                        })
                      ) : [new Paragraph({
                        children: [new TextRun({ text: "No members", size: 16, italics: true })],
                      })],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                    }),
                  ],
                })
              ),
            ],
          }),
        ],
      }],
    });

    // Generate the document buffer
    const buffer = await Packer.toBuffer(doc);

    // Return the document as a downloadable file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="rawlist-${event.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.docx"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("Error generating rawlist DOCX:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}
