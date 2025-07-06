import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is an organizer admin or operator
    if (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Fetch teams with APPROVED or ACCEPTED status from eventcontestteam for the specific event
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
        tg.minAge,
        tg.maxAge,
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
        END as ppd
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

    // Filter out teams where any member's age doesn't match target group age range
    // unless the team status is 'APPROVED_SPECIAL'
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

    return NextResponse.json(filteredTeams);
    
  } catch (error) {
    console.error("Error fetching endlist teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams data" },
      { status: 500 }
    );
  }
}
