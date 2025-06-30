import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrganizerApi, hasRequiredRole } from '@/lib/auth';
import { user_role } from '@prisma/client';
import { prismaExecute } from '@/lib/prisma';
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  VerticalAlign,
  BorderStyle
} from 'docx';
import { Packer } from 'docx';
import { getZoneStatistics } from '@/app/organizer/events/stats/_utils/zone-statistics';

// Define types for data structures (matching the page component)
type ZoneData = {
  id: number;
  name: string;
};

type ProcessedContingent = {
  id: number;
  displayName: string;
  contingentType: string;
  teamsCount: number;
  contestantsCount: number;
};

type StateGroup = {
  stateId: number;
  stateName: string;
  contingents: ProcessedContingent[];
};

type ContestGroup = {
  contestId: number;
  contestName: string;
  contestCode: string;
  stateGroups: StateGroup[];
};

type SchoolLevelGroup = {
  schoolLevel: string;
  contests: ContestGroup[];
};

type StatsSummary = {
  schoolCount: number;
  teamCount: number;
  contestantCount: number;
};

type ZoneStatsResult = {
  zone: ZoneData | null;
  groupedData: SchoolLevelGroup[];
  summary: StatsSummary;
};

// Force dynamic rendering - required for routes that use cookies
export const dynamic = 'force-dynamic';

// Function to get zone statistics
async function getZoneStatsData(zoneId: number): Promise<ZoneStatsResult> {
  // Use the shared getZoneStatistics utility to fetch data exactly the same way as the page component
  const { zone, groupedData, summary } = await getZoneStatistics(zoneId);
  
  return { zone, groupedData, summary };
}

// GET /api/organizer/events/stats/[zoneId]/download-docx
export async function GET(request: NextRequest, { params }: { params: { zoneId: string } }) {
  try {
    // Authenticate the request
    const auth = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
    if (!auth.success) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    // Get zone statistics directly from prisma
    const zoneId = parseInt(params.zoneId);
    const { zone, groupedData, summary } = await getZoneStatsData(zoneId);
    
    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    // Create document title
    const docTitle = zone ? `${zone.name} Zone Statistics` : 'Zone Statistics';

    // Create new document with title
    const doc = new Document({
      title: docTitle,
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: docTitle,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER
            }),
            
            // Summary section
            new Paragraph({
              text: 'Summary',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
            }),
            
            new Table({
              width: { size: 100, type: 'pct' },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph('Schools')] }),
                    new TableCell({ children: [new Paragraph('Teams')] }),
                    new TableCell({ children: [new Paragraph('Contestants')] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(`${summary?.schoolCount || 0}`)] }),
                    new TableCell({ children: [new Paragraph(`${summary?.teamCount || 0}`)] }),
                    new TableCell({ children: [new Paragraph(`${summary?.contestantCount || 0}`)] }),
                  ],
                }),
              ],
            }),
            
            // School level groups
            ...groupedData.flatMap((schoolLevelGroup: SchoolLevelGroup) => [
              // School level heading
              new Paragraph({
                text: getSchoolLevelDisplayName(schoolLevelGroup.schoolLevel),
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 100 },
              }),
              
              // Contest groups
              ...schoolLevelGroup.contests.flatMap((contestGroup: ContestGroup) => [
                // Contest heading
                new Paragraph({
                  text: `${contestGroup.contestName} (${contestGroup.contestCode})`,
                  heading: HeadingLevel.HEADING_3,
                  spacing: { before: 200, after: 100 },
                }),
                
                // Contest statistics table
                contestGroup.stateGroups.length === 0 ?
                  new Paragraph('No data available for this contest.') :
                  new Table({
                    width: { size: 100, type: 'pct' },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 },
                      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                    },
                    rows: [
                      // Header row
                      new TableRow({
                        tableHeader: true,
                        children: [
                          new TableCell({ 
                            children: [new Paragraph({ text: 'State' })],
                            width: { size: 20, type: 'pct' },
                          }),
                          new TableCell({ 
                            children: [new Paragraph({ text: 'Contingent' })],
                            width: { size: 50, type: 'pct' },
                          }),
                          new TableCell({ 
                            children: [new Paragraph({ text: 'Teams', alignment: AlignmentType.RIGHT })],
                            width: { size: 15, type: 'pct' },
                          }),
                          new TableCell({ 
                            children: [new Paragraph({ text: 'Contestants', alignment: AlignmentType.RIGHT })],
                            width: { size: 15, type: 'pct' },
                          }),
                        ],
                      }),
                      
                      // Data rows
                      ...contestGroup.stateGroups.flatMap((stateGroup: StateGroup) =>
                        stateGroup.contingents.map((contingent: ProcessedContingent, i: number) => (
                          new TableRow({
                            children: [
                              // State name (only on first contingent row for each state)
                              new TableCell({ 
                                children: [i === 0 ? new Paragraph(stateGroup.stateName) : new Paragraph('')],
                                verticalMerge: i === 0 ? 'restart' : 'continue',
                              }),
                              // Contingent name and type
                              new TableCell({ 
                                children: [
                                  new Paragraph(contingent.displayName),
                                  new Paragraph({
                                    text: contingent.contingentType === 'SCHOOL' ? 'School' : 'Independent',
                                    style: 'smallGray',
                                  }),
                                ],
                              }),
                              // Teams count
                              new TableCell({ 
                                children: [new Paragraph({ 
                                  text: `${contingent.teamsCount}`,
                                  alignment: AlignmentType.RIGHT,
                                })],
                              }),
                              // Contestants count
                              new TableCell({ 
                                children: [new Paragraph({ 
                                  text: `${contingent.contestantsCount}`,
                                  alignment: AlignmentType.RIGHT,
                                })],
                              }),
                            ],
                          })
                        ))
                      ),
                    ],
                  }),
              ]),
            ]),
          ],
        },
      ],
    });

    // Generate the document buffer using the Packer from docx
    const buffer = await Packer.toBuffer(doc);

    // Prepare the response with the document buffer
    const response = new NextResponse(buffer);
    response.headers.set('Content-Disposition', `attachment; filename="${zone.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_zone_statistics.docx"`);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    return response;
  } catch (error) {
    console.error('Error generating DOCX:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}

// Helper function to get school level display name
function getSchoolLevelDisplayName(schoolLevel: string): string {
  switch (schoolLevel) {
    case 'PRIMARY':
      return 'Primary School';
    case 'SECONDARY':
      return 'Secondary School';
    case 'UNIVERSITY':
      return 'University';
    default:
      return schoolLevel || 'Unknown';
  }
}
