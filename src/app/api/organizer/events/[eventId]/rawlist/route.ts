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

    // Check if user is an organizer
    const userRole = (session.user as any).role;
    if (!["ADMIN", "OPERATOR", "VIEWER"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // First fetch the unique team records to avoid duplication
    const uniqueTeams = await prisma.$queryRaw`
      SELECT DISTINCT
        t.id,
        t.name as teamName,
        t.team_email as teamEmail,
        ct.name as contestName,
        ct.id as contestId,
        ect.status,
        ect.createdAt as registrationDate,
        CASE 
          WHEN c.contingentType = 'SCHOOL' THEN s.name
          WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN hi.name
          WHEN c.contingentType = 'INDEPENDENT' THEN i.name
          ELSE 'Unknown'
        END as contingentName,
        c.contingentType as contingentType,
        CASE 
          WHEN c.contingentType = 'SCHOOL' THEN st_s.name
          WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN st_hi.name
          WHEN c.contingentType = 'INDEPENDENT' THEN st_i.name
          ELSE 'Unknown State'
        END as stateName
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      JOIN contingent c ON t.contingentId = c.id
      JOIN contest ct ON ec.contestId = ct.id
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
      LEFT JOIN independent i ON c.independentId = i.id
      LEFT JOIN state st_s ON s.stateId = st_s.id
      LEFT JOIN state st_hi ON hi.stateId = st_hi.id
      LEFT JOIN state st_i ON i.stateId = st_i.id
      WHERE ec.eventId = ${eventId}
      ORDER BY ct.name, t.name ASC
    ` as any[];
    
    // Now fetch target group info for each unique team/contest combination
    const teamsWithTargetGroups = await Promise.all(
      uniqueTeams.map(async (team) => {
        const targetGroups = await prisma.$queryRaw`
          SELECT 
            tg.schoolLevel,
            CASE 
              WHEN tg.schoolLevel = 'Primary' THEN 'Kids'
              WHEN tg.schoolLevel = 'Secondary' THEN 'Teens'
              WHEN tg.schoolLevel = 'Higher Education' THEN 'Youth'
              ELSE tg.schoolLevel
            END as targetGroupLabel,
            tg.minAge,
            tg.maxAge
          FROM _contesttotargetgroup ctg 
          JOIN targetgroup tg ON tg.id = ctg.B
          WHERE ctg.A = ${team.contestId}
          ORDER BY tg.minAge ASC
        ` as any[];
        
        // Get the combined age range across all target groups
        let minAge = Number.MAX_SAFE_INTEGER;
        let maxAge = 0;
        let schoolLevel = '';
        let targetGroupLabel = '';
        
        if (targetGroups.length > 0) {
          targetGroups.forEach(tg => {
            if (tg.minAge < minAge) minAge = tg.minAge;
            if (tg.maxAge > maxAge) maxAge = tg.maxAge;
            schoolLevel = tg.schoolLevel; // Use the last one
            targetGroupLabel = tg.targetGroupLabel; // Use the last one
          });
        }
        
        return {
          ...team,
          schoolLevel,
          targetGroupLabel,
          minAge,
          maxAge,
          targetGroups: targetGroups.map(tg => ({
            schoolLevel: tg.schoolLevel,
            targetGroupLabel: tg.targetGroupLabel,
            minAge: tg.minAge,
            maxAge: tg.maxAge
          }))
        };
      })
    );

    // Fetch team members for each team
    const teamsWithMembers = await Promise.all(
      teamsWithTargetGroups.map(async (team) => {
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

    // Detect duplicate members across teams - STRICT enforcement (no duplicates across ANY contests)
    // This must exactly match the logic in /api/organizer/events/[eventId]/rawlist/approved-xlsx/route.ts
    console.log('Applying strict duplicate member detection - no duplicates across ANY contests');
    
    const memberTeamMap = new Map<string, Array<{teamId: number, teamName: string}>>(); // contestantId -> team info
    const duplicateMembers = new Set<string>(); // contestantId of duplicate members
    const teamWithDuplicatesMap = new Map<number, boolean>(); // teamId -> has duplicates flag
    
    // First pass: build the contestant -> teams mapping
    teamsWithMembers.forEach(team => {
      team.members.forEach((member: any) => {
        const contestantId = String(member.id); // Use contestant ID not IC for proper matching
        
        if (!memberTeamMap.has(contestantId)) {
          memberTeamMap.set(contestantId, []);
        }
        
        memberTeamMap.get(contestantId)!.push({
          teamId: team.id,
          teamName: team.teamName
        });
        
        // If this contestant belongs to more than one team (across ANY contest), mark as duplicate
        if (memberTeamMap.get(contestantId)!.length > 1) {
          duplicateMembers.add(contestantId);
          
          // Mark ALL teams with this contestant as having duplicates
          memberTeamMap.get(contestantId)!.forEach(teamInfo => {
            teamWithDuplicatesMap.set(teamInfo.teamId, true);
          });
        }
      });
    });
    
    console.log(`Found ${duplicateMembers.size} duplicate contestants across ${teamWithDuplicatesMap.size} teams`);
    if (duplicateMembers.size > 0) {
      console.log('Teams with duplicates:', Array.from(teamWithDuplicatesMap.keys()));
    }

    // Add duplicate information to teams and members
    const teamsWithDuplicateInfo = teamsWithMembers.map(team => {
      const membersWithDuplicateInfo = team.members.map((member: any) => {
        const contestantId = String(member.id);
        const isInDuplicateList = duplicateMembers.has(contestantId);
        const teamsInfo = memberTeamMap.get(contestantId) || [];
        const duplicateTeamNames = teamsInfo
          .filter(t => t.teamId !== team.id) // Exclude current team
          .map(t => t.teamName);
        
        return {
          ...member,
          isDuplicate: isInDuplicateList,
          duplicateTeams: duplicateTeamNames
        };
      });
      
      // A team has duplicate members if it's in our map of teams with duplicates
      const hasDuplicateMembers = teamWithDuplicatesMap.has(team.id);
      
      return {
        ...team,
        members: membersWithDuplicateInfo,
        hasDuplicateMembers
      };
    });

    // Return ALL teams without any filtering (raw data) in the same format as before
    // but now we've eliminated the duplicates
    return NextResponse.json(teamsWithDuplicateInfo);
    
  } catch (error) {
    console.error("Error fetching rawlist teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
