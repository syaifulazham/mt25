import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { prismaExecute } from '@/lib/prisma';
import * as docx from 'docx';
import { Document, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType } from 'docx';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get domain from request for the instructions
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const domain = `${protocol}://${host}`;

    // Get user's contingent information - either as direct participant or as contingent manager
    const userContingents = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT DISTINCT c.id as contingentId, c.name as contingentName
        FROM contingent c
        LEFT JOIN contingentManager cm ON c.id = cm.contingentId
        WHERE c.participantId = ${user.id} OR cm.participantId = ${user.id}
      `
    ) as any[];

    if (!userContingents || userContingents.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User contingent not found' },
        { status: 404 }
      );
    }

    // Prepare array to hold all contingent IDs
    const contingentIds = userContingents.map((c: any) => c.contingentId);
    
    // Create a map of contingent names for reference
    const contingentNameMap = Object.fromEntries(
      userContingents.map((c: any) => [c.contingentId, c.contingentName])
    );

    // Fetch all active contestants with microsites for all contingents the user has access to
    let activeContestants: any[] = [];
    
    // Handle each contingent separately to avoid SQL injection issues with IN clause
    for (const contingentId of contingentIds) {
      const results = await prismaExecute(async (prisma) => 
        prisma.$queryRaw`
          SELECT 
            c.id,
            c.name,
            c.ic,
            c.email,
            c.gender,
            c.age,
            c.edu_level,
            c.class_grade,
            c.class_name,
            c.contingentId,
            m.id as micrositeId,
            m.passcode,
            m.loginCounter
          FROM contestant c
          JOIN microsite m ON c.id = m.contestantId
          WHERE c.contingentId = ${contingentId}
          ORDER BY c.name
        `
      ) as any[];
      
      activeContestants = [...activeContestants, ...results];
    }

    if (activeContestants.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No active contestants found' },
        { status: 404 }
      );
    }

    // Format contestants and group them by education level and class/grade
    interface ContestantData {
      name: string;
      classGrade: string;
      passcode: string;
      ic: string;
    }
    
    interface ContestantGroups {
      [key: string]: ContestantData[];
    }
    
    let contestantGroups: ContestantGroups = {};
    
    activeContestants.forEach((contestant) => {
      let classGradeFormatted = '';
      let groupKey = '';
      
      // Format class/grade based on education level
      if (contestant.edu_level && contestant.class_grade) {
        const eduLevel = contestant.edu_level.toLowerCase();
        if (eduLevel === 'sekolah rendah') {
          classGradeFormatted = `Darjah ${contestant.class_grade}`;
          groupKey = `Darjah ${contestant.class_grade}`;
        } else if (eduLevel === 'sekolah menengah') {
          classGradeFormatted = `Tingkatan ${contestant.class_grade}`;
          groupKey = `Tingkatan ${contestant.class_grade}`;
        } else {
          classGradeFormatted = contestant.edu_level;
          groupKey = contestant.edu_level;
        }
      } else {
        classGradeFormatted = contestant.edu_level || 'Lain-lain';
        groupKey = 'Lain-lain';
      }
      
      // Initialize group if it doesn't exist
      if (!contestantGroups[groupKey]) {
        contestantGroups[groupKey] = [];
      }
      
      // Add to the appropriate group
      contestantGroups[groupKey].push({
        name: contestant.name || '',
        classGrade: classGradeFormatted,
        passcode: contestant.passcode || '',
        ic: contestant.ic || ''
      });
    });
    
    // Sort group keys alphabetically
    const sortedGroupKeys = Object.keys(contestantGroups).sort((a, b) => {
      return a.localeCompare(b);
    });

    // Create DOCX document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'TECHLYMPICS 2025 - AKSES ARENA',
                  bold: true,
                  size: 32,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Arahan Log Masuk:',
                  bold: true,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: '1. Pergi ke ',
                }),
                new TextRun({
                  text: `${domain}/arena/login`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: '2. Masukkan nombor kad pengenalan peserta sebagai ID Pemain',
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: '3. Masukkan kod laluan yang disediakan dalam dokumen ini',
                }),
              ],
              spacing: { after: 400 },
            }),
            
            // Add content for each group
            ...sortedGroupKeys.flatMap((groupKey: string, groupIndex: number) => {
              const contestants = contestantGroups[groupKey];
              
              if (contestants.length === 0) {
                return [];
              }
              
              // Elements for this group
              const groupElements = [
                // Group header with spacing if not first group
                new Paragraph({
                  children: [
                    new TextRun({
                      text: groupKey,
                      bold: true,
                      size: 28,
                    }),
                  ],
                  spacing: { before: groupIndex > 0 ? 500 : 0, after: 200 },
                }),
                
                // Table for this group
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    // Header row
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph({ 
                            children: [new TextRun({ text: 'Bil.', bold: true })]
                          })],
                          width: { size: 10, type: WidthType.PERCENTAGE },
                        }),
                        new TableCell({
                          children: [new Paragraph({ 
                            children: [new TextRun({ text: 'Nama', bold: true })]
                          })],
                          width: { size: 40, type: WidthType.PERCENTAGE },
                        }),
                        new TableCell({
                          children: [new Paragraph({ 
                            children: [new TextRun({ text: 'Darjah/Tingkatan', bold: true })]
                          })],
                          width: { size: 25, type: WidthType.PERCENTAGE },
                        }),
                        new TableCell({
                          children: [new Paragraph({ 
                            children: [new TextRun({ text: 'Kod Laluan', bold: true })]
                          })],
                          width: { size: 25, type: WidthType.PERCENTAGE },
                        }),
                      ],
                    }),
                    
                    // Data rows for this group
                    ...contestants.map((contestant, index) => {
                      return new TableRow({
                        children: [
                          // Bil.
                          new TableCell({
                            children: [new Paragraph({ 
                              children: [new TextRun({ text: `${index + 1}` })]
                            })],
                          }),
                          // Nama
                          new TableCell({
                            children: [
                              new Paragraph({ 
                                children: [new TextRun({ text: contestant.name, bold: true })]
                              })
                            ],
                          }),
                          // Darjah/Tingkatan
                          new TableCell({
                            children: [new Paragraph({ 
                              children: [new TextRun({ text: contestant.classGrade })]
                            })],
                          }),
                          // Kod Laluan
                          new TableCell({
                            children: [
                              new Paragraph({
                                children: [new TextRun({ 
                                  text: contestant.passcode, 
                                  font: 'Courier New' 
                                })],
                                alignment: AlignmentType.CENTER,
                              }),
                            ],
                          }),
                        ],
                      });
                    }),
                  ],
                }),
              ];
              
              return groupElements;
            }),
          ],
        },
      ],
    });

    // Generate document buffer
    const buffer = await docx.Packer.toBuffer(doc);

    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    headers.set('Content-Disposition', 'attachment; filename=akses-arena-peserta.docx');

    return new NextResponse(buffer, { 
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Error generating contestant document:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
