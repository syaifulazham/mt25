import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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
      select: { name: true }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    console.log(`Running diagnostic for PENDING teams eligibility - Event ID: ${eventId}`);

    // Get total count of PENDING teams
    const totalPendingCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      WHERE ec.eventId = ${eventId} AND ect.status = 'PENDING'
    ` as any[];

    // Teams with no members
    const teamsWithNoMembers = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      LEFT JOIN teamMember tm ON t.id = tm.teamId
      WHERE ec.eventId = ${eventId} AND ect.status = 'PENDING'
      GROUP BY t.id
      HAVING COUNT(tm.contestantId) = 0
    ` as any[];

    // Teams with invalid emails
    const teamsWithInvalidEmails = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      WHERE 
        ec.eventId = ${eventId} 
        AND ect.status = 'PENDING'
        AND (
          t.team_email IS NULL 
          OR TRIM(t.team_email) = ''
          OR t.team_email NOT REGEXP '^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        )
    ` as any[];

    // Teams with members in multiple teams across all contests
    const teamsWithDuplicateMembers = await prisma.$queryRaw`
      WITH duplicate_members AS (
        SELECT DISTINCT tm.contestantId
        FROM teamMember tm
        JOIN team t1 ON tm.teamId = t1.id
        JOIN eventcontestteam ect1 ON t1.id = ect1.teamId
        JOIN eventcontest ec1 ON ect1.eventcontestId = ec1.id
        WHERE 
          ec1.eventId = ${eventId}
          AND EXISTS (
            SELECT 1
            FROM teamMember tm2
            JOIN team t2 ON tm2.teamId = t2.id
            JOIN eventcontestteam ect2 ON t2.id = ect2.teamId
            JOIN eventcontest ec2 ON ect2.eventcontestId = ec2.id
            WHERE 
              ec2.eventId = ${eventId}
              AND tm2.contestantId = tm.contestantId
              AND t2.id != t1.id
          )
      )
      SELECT COUNT(DISTINCT t.id) as count
      FROM team t
      JOIN teamMember tm ON t.id = tm.teamId
      JOIN duplicate_members dm ON tm.contestantId = dm.contestantId
      JOIN eventcontestteam ect ON t.id = ect.teamId
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      WHERE ec.eventId = ${eventId} AND ect.status = 'PENDING'
    ` as any[];

    // Teams with age mismatches
    const teamsWithAgeMismatches = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT t.id) as count
      FROM team t
      JOIN teamMember tm ON t.id = tm.teamId
      JOIN contestant c ON tm.contestantId = c.id
      JOIN eventcontestteam ect ON t.id = ect.teamId
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN contest ct ON ec.contestId = ct.id
      JOIN _contesttotargetgroup ctg ON ctg.A = ct.id
      JOIN targetgroup tg ON tg.id = ctg.B
      WHERE 
        ec.eventId = ${eventId}
        AND ect.status = 'PENDING'
        AND ect.status != 'APPROVED_SPECIAL'
        AND (
          (c.age IS NOT NULL AND tg.minAge IS NOT NULL AND c.age < tg.minAge) OR
          (c.age IS NOT NULL AND tg.maxAge IS NOT NULL AND c.age > tg.maxAge)
        )
    ` as any[];

    // Run the eligible teams query to get count
    const eligibleTeamsQuery = await prisma.$queryRaw`
      WITH team_member_counts AS (
        SELECT 
          t.id AS teamId,
          COUNT(tm.contestantId) AS memberCount
        FROM team t
        LEFT JOIN teamMember tm ON t.id = tm.teamId
        GROUP BY t.id
      ),
      invalid_emails AS (
        SELECT 
          t.id AS teamId
        FROM team t
        WHERE 
          t.team_email IS NULL 
          OR TRIM(t.team_email) = ''
          OR t.team_email NOT REGEXP '^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
      ),
      duplicate_members AS (
        -- Find contestants who are in multiple teams across ALL contests
        SELECT 
          DISTINCT tm.contestantId
        FROM teamMember tm
        JOIN team t1 ON tm.teamId = t1.id
        JOIN eventcontestteam ect1 ON t1.id = ect1.teamId
        JOIN eventcontest ec1 ON ect1.eventcontestId = ec1.id
        WHERE 
          ec1.eventId = ${eventId}
          AND EXISTS (
            SELECT 1
            FROM teamMember tm2
            JOIN team t2 ON tm2.teamId = t2.id
            JOIN eventcontestteam ect2 ON t2.id = ect2.teamId
            JOIN eventcontest ec2 ON ect2.eventcontestId = ec2.id
            WHERE 
              ec2.eventId = ${eventId}
              AND tm2.contestantId = tm.contestantId
              AND t2.id != t1.id  -- Different team
          )
      ),
      teams_with_duplicates AS (
        SELECT 
          DISTINCT t.id
        FROM team t
        JOIN teamMember tm ON t.id = tm.teamId
        JOIN duplicate_members dm ON tm.contestantId = dm.contestantId
      ),
      age_mismatches AS (
        SELECT 
          DISTINCT t.id AS teamId
        FROM team t
        JOIN teamMember tm ON t.id = tm.teamId
        JOIN contestant c ON tm.contestantId = c.id
        JOIN eventcontestteam ect ON t.id = ect.teamId
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        JOIN contest ct ON ec.contestId = ct.id
        JOIN _contesttotargetgroup ctg ON ctg.A = ct.id
        JOIN targetgroup tg ON tg.id = ctg.B
        WHERE 
          ec.eventId = ${eventId}
          AND ect.status = 'PENDING'
          AND ect.status != 'APPROVED_SPECIAL'
          AND (
            (c.age IS NOT NULL AND tg.minAge IS NOT NULL AND c.age < tg.minAge) OR
            (c.age IS NOT NULL AND tg.maxAge IS NOT NULL AND c.age > tg.maxAge)
          )
      )
      
      SELECT COUNT(DISTINCT t.id) as count
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      JOIN team_member_counts tmc ON t.id = tmc.teamId
      WHERE 
        ec.eventId = ${eventId}
        AND ect.status = 'PENDING'
        AND tmc.memberCount > 0
        AND t.id NOT IN (SELECT teamId FROM age_mismatches)
        AND t.id NOT IN (SELECT id FROM teams_with_duplicates)
        AND t.id NOT IN (SELECT teamId FROM invalid_emails)
    ` as any[];

    // Sample team details
    const sampleTeams = await prisma.$queryRaw`
      WITH team_member_counts AS (
        SELECT 
          t.id AS teamId,
          COUNT(tm.contestantId) AS memberCount
        FROM team t
        LEFT JOIN teamMember tm ON t.id = tm.teamId
        GROUP BY t.id
      ),
      invalid_emails AS (
        SELECT 
          t.id AS teamId
        FROM team t
        WHERE 
          t.team_email IS NULL 
          OR TRIM(t.team_email) = ''
          OR t.team_email NOT REGEXP '^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
      ),
      duplicate_members AS (
        -- Find contestants who are in multiple teams across ALL contests
        SELECT 
          DISTINCT tm.contestantId
        FROM teamMember tm
        JOIN team t1 ON tm.teamId = t1.id
        JOIN eventcontestteam ect1 ON t1.id = ect1.teamId
        JOIN eventcontest ec1 ON ect1.eventcontestId = ec1.id
        WHERE 
          ec1.eventId = ${eventId}
          AND EXISTS (
            SELECT 1
            FROM teamMember tm2
            JOIN team t2 ON tm2.teamId = t2.id
            JOIN eventcontestteam ect2 ON t2.id = ect2.teamId
            JOIN eventcontest ec2 ON ect2.eventcontestId = ec2.id
            WHERE 
              ec2.eventId = ${eventId}
              AND tm2.contestantId = tm.contestantId
              AND t2.id != t1.id  -- Different team
          )
      ),
      teams_with_duplicates AS (
        SELECT 
          DISTINCT t.id
        FROM team t
        JOIN teamMember tm ON t.id = tm.teamId
        JOIN duplicate_members dm ON tm.contestantId = dm.contestantId
      ),
      age_mismatches AS (
        SELECT 
          DISTINCT t.id AS teamId
        FROM team t
        JOIN teamMember tm ON t.id = tm.teamId
        JOIN contestant c ON tm.contestantId = c.id
        JOIN eventcontestteam ect ON t.id = ect.teamId
        JOIN eventcontest ec ON ect.eventcontestId = ec.id
        JOIN contest ct ON ec.contestId = ct.id
        JOIN _contesttotargetgroup ctg ON ctg.A = ct.id
        JOIN targetgroup tg ON tg.id = ctg.B
        WHERE 
          ec.eventId = ${eventId}
          AND ect.status = 'PENDING'
          AND ect.status != 'APPROVED_SPECIAL'
          AND (
            (c.age IS NOT NULL AND tg.minAge IS NOT NULL AND c.age < tg.minAge) OR
            (c.age IS NOT NULL AND tg.maxAge IS NOT NULL AND c.age > tg.maxAge)
          )
      )
      
      SELECT 
        t.id,
        t.name as teamName,
        t.team_email as teamEmail,
        CASE 
          WHEN t.team_email IS NULL OR TRIM(t.team_email) = '' THEN 'missing'
          WHEN t.team_email REGEXP '^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' THEN 'valid'
          ELSE 'invalid'
        END as emailStatus,
        tmc.memberCount,
        CASE WHEN t.id IN (SELECT teamId FROM age_mismatches) THEN 'yes' ELSE 'no' END as hasAgeMismatch,
        CASE WHEN t.id IN (SELECT id FROM teams_with_duplicates) THEN 'yes' ELSE 'no' END as hasDuplicateMembers,
        CASE 
          WHEN tmc.memberCount > 0 
               AND t.id NOT IN (SELECT teamId FROM age_mismatches)
               AND t.id NOT IN (SELECT id FROM teams_with_duplicates)
               AND t.id NOT IN (SELECT teamId FROM invalid_emails)
          THEN 'eligible'
          ELSE 'ineligible'
        END as eligibilityStatus,
        CASE 
          WHEN tmc.memberCount = 0 THEN 'No members'
          WHEN t.id IN (SELECT teamId FROM age_mismatches) THEN 'Age mismatch'
          WHEN t.id IN (SELECT id FROM teams_with_duplicates) THEN 'Duplicate members'
          WHEN t.id IN (SELECT teamId FROM invalid_emails) THEN 'Invalid email'
          ELSE 'All criteria met'
        END as failureReason
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      JOIN team_member_counts tmc ON t.id = tmc.teamId
      WHERE 
        ec.eventId = ${eventId}
        AND ect.status = 'PENDING'
      LIMIT 10
    ` as any[];

    // Return diagnostic information
    return NextResponse.json({
      event: event.name,
      summary: {
        totalPendingCount: Number(totalPendingCount[0]?.count || 0),
        eligibleCount: Number(eligibleTeamsQuery[0]?.count || 0),
        teamsWithNoMembersCount: teamsWithNoMembers.length,
        teamsWithInvalidEmailsCount: Number(teamsWithInvalidEmails[0]?.count || 0),
        teamsWithDuplicateMembersCount: Number(teamsWithDuplicateMembers[0]?.count || 0),
        teamsWithAgeMismatchesCount: Number(teamsWithAgeMismatches[0]?.count || 0),
      },
      sampleTeams,
      filters: {
        emailRegex: '^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        hasMemberCheck: 'memberCount > 0',
        duplicateLogic: 'Find contestants who are in multiple teams across ALL contests'
      }
    });
  } catch (error) {
    console.error("Error running diagnostic:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        error: "Failed to run diagnostic",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
