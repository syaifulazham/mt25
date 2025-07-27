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

    // Fetch team members for each team using the same structure as the working endlist API
    const teamsWithMembers = await Promise.all(
      teams.map(async (team: any) => {
        const members = await prisma.$queryRaw`
          SELECT 
            con.id,
            con.name as participantName,
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
        ` as TeamMember[];

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
