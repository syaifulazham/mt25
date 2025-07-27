import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRequiredRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, HeadingLevel } from "docx";

interface ContingentInfo {
  id: number;
  name: string;
  contingentType: string;
  stateName: string;
  ppd: string | null;
  institutionName: string;
  teamCount: number;
  participantCount: number;
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

    // Fetch contingents participating in the event with their details
    // Use a simpler approach to avoid GROUP BY issues with CASE statements
    const rawContingents = await prisma.$queryRaw`
      SELECT DISTINCT
        c.id,
        c.name as contingentName,
        c.contingentType,
        c.schoolId,
        c.higherInstId,
        c.independentId
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      JOIN contingent c ON t.contingentId = c.id
      WHERE ec.eventId = ${eventId}
        AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
      ORDER BY c.name ASC
    ` as any[];

    // Process each contingent to get additional details
    const contingents: ContingentInfo[] = await Promise.all(
      rawContingents.map(async (contingent: any) => {
        let stateName = 'Unknown State';
        let ppd: string | null = null;
        let institutionName = 'Unknown Institution';
        let teamCount = 0;
        let participantCount = 0;

        // Get institution and state details based on contingent type
        if (contingent.contingentType === 'SCHOOL' && contingent.schoolId) {
          const school = await prisma.school.findUnique({
            where: { id: contingent.schoolId },
            include: { state: true }
          });
          if (school) {
            institutionName = school.name;
            ppd = school.ppd;
            stateName = school.state.name;
          }
        } else if (contingent.contingentType === 'HIGHER_INSTITUTION' && contingent.higherInstId) {
          const higherInst = await prisma.higherinstitution.findUnique({
            where: { id: contingent.higherInstId },
            include: { state: true }
          });
          if (higherInst) {
            institutionName = higherInst.name;
            stateName = higherInst.state.name;
          }
        } else if (contingent.contingentType === 'INDEPENDENT' && contingent.independentId) {
          const independent = await prisma.independent.findUnique({
            where: { id: contingent.independentId },
            include: { state: true }
          });
          if (independent) {
            institutionName = independent.name;
            stateName = independent.state.name;
          }
        }

        // Get team and participant counts
        const teamCountResult = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT t.id) as count
          FROM eventcontestteam ect
          JOIN eventcontest ec ON ect.eventcontestId = ec.id
          JOIN team t ON ect.teamId = t.id
          WHERE ec.eventId = ${eventId}
            AND t.contingentId = ${contingent.id}
            AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
        ` as any[];
        teamCount = Number(teamCountResult[0]?.count || 0);

        const participantCountResult = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT tm.contestantId) as count
          FROM eventcontestteam ect
          JOIN eventcontest ec ON ect.eventcontestId = ec.id
          JOIN team t ON ect.teamId = t.id
          LEFT JOIN teamMember tm ON t.id = tm.teamId
          WHERE ec.eventId = ${eventId}
            AND t.contingentId = ${contingent.id}
            AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
        ` as any[];
        participantCount = Number(participantCountResult[0]?.count || 0);

        return {
          id: contingent.id,
          name: contingent.contingentName,
          contingentType: contingent.contingentType,
          stateName,
          ppd,
          institutionName,
          teamCount,
          participantCount
        };
      })
    );

    console.log(`Found ${contingents.length} contingents for event ${eventId}`);
    console.log('Sample contingent data:', contingents.slice(0, 2));

    // Group contingents by state
    const groupedContingents: Record<string, ContingentInfo[]> = {};
    
    contingents.forEach(contingent => {
      const state = contingent.stateName || 'Unknown State';
      if (!groupedContingents[state]) {
        groupedContingents[state] = [];
      }
      groupedContingents[state].push(contingent);
    });

    // Create document content
    const children = [];
    
    // Title
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${event.name} - Contingents List Report`, bold: true, size: 32, font: 'Calibri' })],
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

    // Summary table
    const summaryTableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "State", bold: true, font: 'Calibri' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Contingent Name", bold: true, font: 'Calibri' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Type", bold: true, font: 'Calibri' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Institution", bold: true, font: 'Calibri' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PPD", bold: true, font: 'Calibri' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Teams", bold: true, font: 'Calibri' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Participants", bold: true, font: 'Calibri' })] })] }),
        ]
      })
    ];

    // Process each state
    Object.keys(groupedContingents).sort().forEach(state => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: state, bold: true, size: 24, font: 'Calibri' })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 600, after: 300 }
        })
      );

      groupedContingents[state].forEach((contingent: ContingentInfo) => {
        const contingentTypeDisplay = contingent.contingentType === 'SCHOOL' ? 'School' : 
                                    contingent.contingentType === 'HIGHER_INSTITUTION' ? 'Higher Institution' : 
                                    contingent.contingentType === 'INDEPENDENT' ? 'Independent' : 
                                    contingent.contingentType;

        summaryTableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: contingent.stateName, font: 'Calibri' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: contingent.name, font: 'Calibri' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: contingentTypeDisplay, font: 'Calibri' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: contingent.institutionName, font: 'Calibri' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: contingent.ppd || 'N/A', font: 'Calibri' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(contingent.teamCount), font: 'Calibri' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(contingent.participantCount), font: 'Calibri' })] })] }),
            ]
          })
        );
      });
    });

    // Add the summary table
    const summaryTable = new Table({
      rows: summaryTableRows,
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

    children.push(summaryTable);
    children.push(new Paragraph({ text: "", spacing: { after: 400 } }));

    // Detailed breakdown by state
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Detailed Breakdown by State", bold: true, size: 24, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 600, after: 300 }
      })
    );

    Object.keys(groupedContingents).sort().forEach(state => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: state, bold: true, size: 20, font: 'Calibri' })],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 400, after: 200 }
        })
      );

      // Group by contingent type within state
      const typeGroups: Record<string, ContingentInfo[]> = {};
      groupedContingents[state].forEach(contingent => {
        const type = contingent.contingentType;
        if (!typeGroups[type]) typeGroups[type] = [];
        typeGroups[type].push(contingent);
      });

      Object.keys(typeGroups).sort().forEach(type => {
        const typeDisplay = type === 'SCHOOL' ? 'School Contingents' : 
                           type === 'HIGHER_INSTITUTION' ? 'Higher Institution Contingents' : 
                           type === 'INDEPENDENT' ? 'Independent Contingents' : 
                           type;

        children.push(
          new Paragraph({
            children: [new TextRun({ text: typeDisplay, bold: true, size: 16, font: 'Calibri' })],
            heading: HeadingLevel.HEADING_4,
            spacing: { before: 300, after: 150 }
          })
        );

        typeGroups[type].forEach((contingent: ContingentInfo, index: number) => {
          const contingentInfo = [
            `${index + 1}. ${contingent.name}`,
            `   Institution: ${contingent.institutionName}`,
            contingent.ppd ? `   PPD: ${contingent.ppd}` : null,
            `   Teams: ${contingent.teamCount}, Participants: ${contingent.participantCount}`
          ].filter(Boolean);

          contingentInfo.forEach((info, infoIndex) => {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: info || '', font: 'Calibri', bold: infoIndex === 0 })],
                spacing: { after: infoIndex === contingentInfo.length - 1 ? 150 : 50 }
              })
            );
          });
        });
      });
    });

    // Statistics
    const totalContingents = contingents.length;
    const totalTeams = contingents.reduce((sum, c) => sum + c.teamCount, 0);
    const totalParticipants = contingents.reduce((sum, c) => sum + c.participantCount, 0);
    const schoolContingents = contingents.filter(c => c.contingentType === 'SCHOOL').length;
    const higherInstContingents = contingents.filter(c => c.contingentType === 'HIGHER_INSTITUTION').length;
    const independentContingents = contingents.filter(c => c.contingentType === 'INDEPENDENT').length;

    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Statistics", bold: true, size: 24, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 600, after: 200 }
      })
    );

    const stats = [
      `Total Contingents: ${totalContingents}`,
      `Total Teams: ${totalTeams}`,
      `Total Participants: ${totalParticipants}`,
      `School Contingents: ${schoolContingents}`,
      `Higher Institution Contingents: ${higherInstContingents}`,
      `Independent Contingents: ${independentContingents}`,
      `States Represented: ${Object.keys(groupedContingents).length}`
    ];

    stats.forEach(stat => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: stat, font: 'Calibri' })],
          spacing: { after: 100 }
        })
      );
    });

    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Note: PPD (Pejabat Pendidikan Daerah) information is only available for school contingents.", italics: true, font: 'Calibri' })],
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
    const fileName = `contingents-list-${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.docx`;
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error("Error generating contingents list DOCX:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to generate contingents list DOCX file", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
