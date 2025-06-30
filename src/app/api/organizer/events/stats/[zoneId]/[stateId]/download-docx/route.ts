import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrganizerApi, hasRequiredRole } from '@/lib/auth';
import { user_role } from '@prisma/client';
import * as docx from 'docx';
import { getStateStatistics } from '@/app/organizer/events/stats/_utils/state-statistics';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { zoneId: string; stateId: string } }
) {
  try {
    // Authenticate and check permissions
    const authResponse = await authenticateOrganizerApi();
    
    // Check if authentication was successful
    if (!authResponse.success) {
      return NextResponse.json({ error: authResponse.message || 'Unauthorized' }, { status: authResponse.status || 401 });
    }
    
    const user = authResponse.user;
    if (!hasRequiredRole(user, [user_role.ADMIN, user_role.OPERATOR])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse IDs
    const zoneId = parseInt(params.zoneId, 10);
    const stateId = parseInt(params.stateId, 10);

    if (isNaN(zoneId) || isNaN(stateId)) {
      return NextResponse.json({ error: 'Invalid zone or state ID' }, { status: 400 });
    }

    // Get state statistics data using the shared utility
    const { zone, state, groupedData, summary } = await getStateStatistics(zoneId, stateId);

    if (!zone || !state) {
      return NextResponse.json({ error: 'Zone or state not found' }, { status: 404 });
    }

    // Create document title
    const docTitle = `${state.name} State Statistics`;

    // Create header content
    const headerContent = [
      new docx.Paragraph({
        text: docTitle,
        heading: docx.HeadingLevel.TITLE,
        alignment: docx.AlignmentType.CENTER
      }),
      
      // Zone information
      new docx.Paragraph({
        text: `Zone: ${zone.name}`,
        heading: docx.HeadingLevel.HEADING_2,
        alignment: docx.AlignmentType.CENTER
      }),
      
      // Summary section
      new docx.Paragraph({
        text: 'Summary',
        heading: docx.HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 }
      }),
      
      // Summary table
      // Create a simple table for the summary
      new docx.Table({
        columnWidths: [3000, 3000],
        rows: [
          new docx.TableRow({
            children: [
              new docx.TableCell({
                children: [new docx.Paragraph('Total Schools')],
                verticalAlign: docx.VerticalAlign.CENTER,
              }),
              new docx.TableCell({
                children: [new docx.Paragraph(`${summary.schoolCount}`)],
                verticalAlign: docx.VerticalAlign.CENTER,
              }),
            ],
          }),
          new docx.TableRow({
            children: [
              new docx.TableCell({
                children: [new docx.Paragraph('Total Teams')],
                verticalAlign: docx.VerticalAlign.CENTER,
              }),
              new docx.TableCell({
                children: [new docx.Paragraph(`${summary.teamCount}`)],
                verticalAlign: docx.VerticalAlign.CENTER,
              }),
            ],
          }),
          new docx.TableRow({
            children: [
              new docx.TableCell({
                children: [new docx.Paragraph('Total Contestants')],
                verticalAlign: docx.VerticalAlign.CENTER,
              }),
              new docx.TableCell({
                children: [new docx.Paragraph(`${summary.contestantCount}`)],
                verticalAlign: docx.VerticalAlign.CENTER,
              }),
            ],
          }),
        ],
        width: {
          size: 100,
          type: 'pct',
        },
        borders: {
          top: { style: docx.BorderStyle.SINGLE, size: 1 },
          bottom: { style: docx.BorderStyle.SINGLE, size: 1 },
          left: { style: docx.BorderStyle.SINGLE, size: 1 },
          right: { style: docx.BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: docx.BorderStyle.SINGLE, size: 1 },
        },
      }),
      
      // Details section heading
      new docx.Paragraph({
        text: 'Details by School Level and Contest',
        heading: docx.HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
    ];
    
    // This avoids issues with accessing document sections directly
    // Create array to hold all our content elements
    // We'll place contest headings and their tables together in the content
    let combinedContent: (docx.IParagraphOptions | docx.Table)[] = [];
    
    for (const schoolLevel of groupedData) {
      // School level heading
      combinedContent.push({
        text: schoolLevel.schoolLevel,
        heading: docx.HeadingLevel.HEADING_3,
        spacing: { before: 300, after: 120 }
      });

      // Add contests for this school level
      for (const contest of schoolLevel.contests) {
        // Contest heading
        combinedContent.push({
          text: `${contest.contestName} (${contest.contestCode})`,
          heading: docx.HeadingLevel.HEADING_4,
          spacing: { before: 200, after: 120 }
        });

        // Create table for contingents in this contest
        const tableRows: docx.TableRow[] = [
          // Header row
          new docx.TableRow({
            children: [
              new docx.TableCell({
                children: [new docx.Paragraph('Contingent')],
                verticalAlign: docx.VerticalAlign.CENTER,
              }),
              new docx.TableCell({
                children: [new docx.Paragraph('Type')],
                verticalAlign: docx.VerticalAlign.CENTER,
              }),
              new docx.TableCell({
                children: [new docx.Paragraph('Teams')],
                verticalAlign: docx.VerticalAlign.CENTER,
              }),
              new docx.TableCell({
                children: [new docx.Paragraph('Contestants')],
                verticalAlign: docx.VerticalAlign.CENTER,
              }),
            ],
          }),
        ];

        // Add rows for each contingent
        for (const contingent of contest.contingents) {
          tableRows.push(
            new docx.TableRow({
              children: [
                new docx.TableCell({
                  children: [new docx.Paragraph(contingent.displayName)],
                  verticalAlign: docx.VerticalAlign.CENTER,
                }),
                new docx.TableCell({
                  children: [new docx.Paragraph(contingent.contingentType)],
                  verticalAlign: docx.VerticalAlign.CENTER,
                }),
                new docx.TableCell({
                  children: [new docx.Paragraph(`${contingent.teamsCount}`)],
                  verticalAlign: docx.VerticalAlign.CENTER,
                }),
                new docx.TableCell({
                  children: [new docx.Paragraph(`${contingent.contestantsCount}`)],
                  verticalAlign: docx.VerticalAlign.CENTER,
                }),
              ],
            })
          );
        }

        // Add contingents table
        const contingentsTable = new docx.Table({
          rows: tableRows,
          width: {
            size: 100,
            type: 'pct',
          },
          borders: {
            top: { style: docx.BorderStyle.SINGLE, size: 1 },
            bottom: { style: docx.BorderStyle.SINGLE, size: 1 },
            left: { style: docx.BorderStyle.SINGLE, size: 1 },
            right: { style: docx.BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: docx.BorderStyle.SINGLE, size: 1 },
          },
        });
        
        // Add table immediately after its heading
        combinedContent.push(contingentsTable);

        // Add space after table
        combinedContent.push({ text: '', spacing: { after: 200 } });
      }

      // No need for section index with our new approach
    }
    
    // Process the combinedContent array to convert paragraph options to actual Paragraph objects
    const processedContent = combinedContent.map(item => {
      // If it's a Table, return it as is
      if (item instanceof docx.Table) {
        return item;
      } 
      // Otherwise, convert paragraph options to a Paragraph
      return new docx.Paragraph(item);
    });
    
    // Combine all content
    const allChildren = [...headerContent, ...processedContent];
    
    // Create new document with all content
    const doc = new docx.Document({
      title: docTitle,
      sections: [
        {
          properties: {},
          children: allChildren
        }
      ]
    });

    // Generate the document buffer using the Packer from docx
    const buffer = await docx.Packer.toBuffer(doc);

    // Prepare the response with the document buffer
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${state.name}_Statistics.docx"`,
      },
    });
  } catch (error) {
    console.error('Error generating DOCX:', error);
    return NextResponse.json(
      { error: 'Error generating DOCX', details: (error as Error).message },
      { status: 500 }
    );
  }
}
