import { NextRequest, NextResponse } from "next/server";
import { Document, Paragraph, Table, TableRow, TableCell, HeadingLevel, AlignmentType, BorderStyle, WidthType } from "docx";
import { Packer } from "docx";
import { prismaExecute } from "@/lib/prisma";
import { authenticateOrganizerApi } from "@/lib/auth";
import { user_role } from "@prisma/client";
import { headers } from "next/headers";

// Force dynamic rendering - required for routes that use cookies
export const dynamic = 'force-dynamic';

// Define types
type ParticipantData = {
  name: string;
  ic: string;
  classGrade: string;
  gender: string;
  contingentName: string;
  stateName: string;
};

type ContingentGroup = {
  contingentName: string;
  contingentType: string;
  participants: ParticipantData[];
};

type StateGroup = {
  stateName: string;
  contingents: ContingentGroup[];
};

// Helper function to group participants by state and contingent
function groupParticipantsByStateAndContingent(participants: ParticipantData[]): StateGroup[] {
  const stateMap = new Map<string, Map<string, ParticipantData[]>>();

  // Group participants by state and contingent
  for (const participant of participants) {
    if (!stateMap.has(participant.stateName)) {
      stateMap.set(participant.stateName, new Map<string, ParticipantData[]>());
    }
    
    const contingentMap = stateMap.get(participant.stateName)!;
    if (!contingentMap.has(participant.contingentName)) {
      contingentMap.set(participant.contingentName, []);
    }
    
    contingentMap.get(participant.contingentName)!.push(participant);
  }

  // Convert map to array structure
  const result: StateGroup[] = [];
  
  // Sort states alphabetically
  const sortedStates = Array.from(stateMap.keys()).sort();
  
  for (const stateName of sortedStates) {
    const contingentMap = stateMap.get(stateName)!;
    const contingents: ContingentGroup[] = [];
    
    // Sort contingents alphabetically
    const sortedContingents = Array.from(contingentMap.keys()).sort();
    
    for (const contingentName of sortedContingents) {
      contingents.push({
        contingentName,
        contingentType: "N/A", // We'll set this properly when we have the data
        participants: contingentMap.get(contingentName)!.sort((a, b) => a.name.localeCompare(b.name))
      });
    }
    
    result.push({
      stateName,
      contingents
    });
  }
  
  return result;
}

// Helper function to create table headers row
function createHeaderRow() {
  const borderColor = "D9D9D9"; // Much lighter gray (was 808080)
  return new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [new Paragraph({ text: '#', alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_4 })],
        width: { size: 5, type: 'pct' },
        borders: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
          top: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        }
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Name', alignment: AlignmentType.LEFT, heading: HeadingLevel.HEADING_4 })],

        width: { size: 30, type: 'pct' },
        borders: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
          top: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        }
      }),
      new TableCell({
        children: [new Paragraph({ text: 'IC', alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_4 })],
        width: { size: 15, type: 'pct' },
        borders: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
          top: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        }
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Darjah/Tingkatan', alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_4 })],
        width: { size: 25, type: 'pct' },
        borders: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
          top: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        }
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Gender', alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_4 })],
        width: { size: 25, type: 'pct' },
        borders: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
          top: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        }
      }),
    ],
  });
}

// Helper function to create a table for a single contingent
function createContingentTable(contingent: ContingentGroup) {
  const rows: TableRow[] = [createHeaderRow()];
  const borderColor = "D9D9D9"; // Much lighter gray (was 808080)

  // Add participant rows with numbering that resets for each contingent
  contingent.participants.forEach((participant, index) => {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              text: `${index + 1}`, 
              alignment: AlignmentType.CENTER 
            })],
            borders: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
              top: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            }
          }),
          new TableCell({
            children: [new Paragraph(participant.name)],
            borders: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
              top: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            }
          }),
          new TableCell({
            children: [new Paragraph(participant.ic)],
            borders: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
              top: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            }
          }),
          new TableCell({
            children: [new Paragraph({ 
              text: participant.classGrade || 'N/A', 
              alignment: AlignmentType.CENTER  // Center align Darjah/Tingkatan
            })],
            borders: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
              top: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            }
          }),
          new TableCell({
            children: [new Paragraph({ 
              text: participant.gender, 
              alignment: AlignmentType.CENTER  // Center align Gender
            })],
            borders: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
              top: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            }
          }),
        ],
      })
    );
  });

  // Return the complete table
  return new Table({
    width: { size: 100, type: 'pct' },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows,
  });
}

// Helper function to create all elements for a state group
function createStateGroupElements(stateGroup: StateGroup) {
  // Create elements array to return
  const elements: (Paragraph | Table)[] = [
    // State heading
    new Paragraph({
      text: stateGroup.stateName,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    })
  ];
  
  // For each contingent, add heading and table
  for (const contingent of stateGroup.contingents) {
    // Add contingent heading
    elements.push(
      new Paragraph({
        text: contingent.contingentName,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 300, after: 100 },
      })
    );
    
    // Add table for this contingent
    elements.push(createContingentTable(contingent));
    
    // Add spacing after table
    elements.push(new Paragraph({ spacing: { after: 300 } }));
  }
  
  return elements;
}

export async function GET(request: NextRequest, { params }: { params: { zoneId: string } }) {
  console.log(`[download-participant-list-docx] Processing request for zone ${params.zoneId}`);
  
  try {
    // Authentication check
    const headersList = headers();
    const adminAccessKey = headersList.get('X-Admin-Access');
    const envAdminKey = process.env.ADMIN_ACCESS_KEY;
    
    let isAuthenticated = false;
    // Use a variable that can hold any user role value
    let userRole: user_role = user_role.VIEWER; // Default lowest access
    
    // Admin key bypass
    if (adminAccessKey && envAdminKey && adminAccessKey === envAdminKey) {
      console.log('[download-participant-list-docx] Admin access authorized via header key');
      isAuthenticated = true;
      userRole = user_role.ADMIN;
    }
    
    // If not authenticated via headers, try cookie-based authentication
    if (!isAuthenticated) {
      console.log('[download-participant-list-docx] Attempting cookie-based authentication...');
      const auth = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
      
      if (!auth.success) {
        console.error(`[download-participant-list-docx] API Auth Error: ${auth.message}`);
        
        // Allow access in development mode regardless of auth status
        if (process.env.NODE_ENV === 'development') {
          console.log('[download-participant-list-docx] Development mode: Bypassing authentication checks');
          isAuthenticated = true;
          userRole = user_role.ADMIN;
        } else {
          return new NextResponse(auth.message || 'Unauthorized', { status: auth.status || 401 });
        }
      } else {
        isAuthenticated = true;
        userRole = auth.user?.role as user_role || user_role.ADMIN;
        console.log(`[download-participant-list-docx] User authorized as ${userRole}`);
      }
    }
    
    // Final authentication check
    if (!isAuthenticated) {
      console.log('[download-participant-list-docx] Authentication failed after all methods');
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // Parse zoneId
    const zoneId = parseInt(params.zoneId);
    if (isNaN(zoneId)) {
      console.log(`[download-participant-list-docx] Invalid zoneId: ${params.zoneId}`);
      return new NextResponse('Invalid zone ID', { status: 400 });
    }

    // Fetch zone info
    const zone = await prismaExecute((prisma) => prisma.zone.findUnique({
      where: { id: zoneId },
    }));

    if (!zone) {
      console.log(`[download-participant-list-docx] Zone not found: ${zoneId}`);
      return new NextResponse('Zone not found', { status: 404 });
    }

    console.log(`[download-participant-list-docx] Fetching participant data for zone: ${zone.name}`);

    // Fetch all participants data from database with necessary joins
    const participants = await prismaExecute(async (prisma) => {
      // First, find all teams in the zone through contingents
      const teamsInZone = await prisma.team.findMany({
        where: {
          OR: [
            {
              // Teams from school contingents
              contingent: {
                school: {
                  state: {
                    zone: {
                      id: zoneId
                    }
                  }
                }
              }
            },
            {
              // Teams from independent contingents
              contingent: {
                independent: {
                  state: {
                    zone: {
                      id: zoneId
                    }
                  }
                }
              }
            }
          ]
        },
        select: { id: true }
      });

      const teamIds = teamsInZone.map(team => team.id);
      
      // Then find all contestants in those teams
      return prisma.contestant.findMany({
        where: {
          teamMembers: {
            some: {
              teamId: {
                in: teamIds
              }
            }
          }
        },
        include: {
          teamMembers: {
            include: {
              team: {
                include: {
                  contingent: {
                    include: {
                      school: {
                        include: {
                          state: true
                        }
                      },
                      independent: {
                        include: {
                          state: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    });

    console.log(`[download-participant-list-docx] Found ${participants.length} participants`);

    // Transform data for document creation
    const participantData: ParticipantData[] = participants.map(contestant => {
      // Get the first team (assuming a contestant might be in multiple teams)
      const team = contestant.teamMembers[0]?.team;
      const contingent = team?.contingent;
      
      let stateName = 'Unknown';
      let contingentName = 'Unknown';
      
      if (contingent) {
        if (contingent.school) {
          stateName = contingent.school.state?.name || 'Unknown';
          contingentName = contingent.school.name;
        } else if (contingent.independent) {
          stateName = contingent.independent.state?.name || 'Unknown';
          contingentName = contingent.independent.name;
        }
      }
      
      return {
        name: contestant.name,
        ic: contestant.ic || 'N/A',
        classGrade: contestant.class_grade || 'N/A',
        gender: contestant.gender,
        contingentName,
        stateName
      };
    });

    // Group participants by state and contingent
    const groupedData = groupParticipantsByStateAndContingent(participantData);
    
    console.log(`[download-participant-list-docx] Grouped into ${groupedData.length} states`);

    // Generate the document
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
            },
          },
        },
      },
      sections: [
        {
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: `${zone.name} Zone - Participant List`,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            
            // Generated timestamp
            new Paragraph({
              text: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }, // Add some space after the timestamp
            }),
            
            // Summary count
            new Paragraph({
              text: `Total Participants: ${participantData.length}`,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),
            
            // State by state participant tables with separate tables for each contingent
            ...groupedData.flatMap(stateGroup => createStateGroupElements(stateGroup))
          ],
        },
      ],
    });

    // Generate the document buffer
    const buffer = await Packer.toBuffer(doc);
    
    console.log('[download-participant-list-docx] Document generated successfully');

    // Prepare the filename
    const sanitizedZoneName = zone.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${sanitizedZoneName}_participant_list.docx`;

    // Return the document as a downloadable response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('[download-participant-list-docx] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
