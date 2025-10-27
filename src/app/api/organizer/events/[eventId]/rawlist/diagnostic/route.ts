import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

    console.log(`Running improved diagnostic for PENDING teams eligibility - Event ID: ${eventId}`);

    // Get total count of PENDING teams - this query is simple and reliable
    const totalPendingCountResult = await prisma.eventcontestteam.count({
      where: {
        eventcontest: {
          eventId: eventId
        },
        status: 'PENDING'
      }
    });
    
    // Count teams with invalid emails (simplified query)
    const invalidEmailsCount = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT t.id) as count
      FROM team t
      JOIN eventcontestteam ect ON t.id = ect.teamId
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      WHERE 
        ec.eventId = ${eventId} 
        AND ect.status = 'PENDING'
        AND (
          t.team_email IS NULL 
          OR TRIM(t.team_email) = ''
          OR t.team_email NOT REGEXP '^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        )
    ` as any[];
    
    // Count teams with no members (simplified query)
    const emptyTeamsCount = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT t.id) as count
      FROM team t
      JOIN eventcontestteam ect ON t.id = ect.teamId
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      LEFT JOIN teamMember tm ON t.id = tm.teamId
      WHERE 
        ec.eventId = ${eventId} 
        AND ect.status = 'PENDING'
      GROUP BY t.id
      HAVING COUNT(tm.contestantId) = 0
    ` as any[];
    
    // Count duplicate teams - this is a simpler version that may overcount
    const duplicatesCountQuery = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT t.id) as count
      FROM team t
      JOIN teamMember tm ON t.id = tm.teamId
      JOIN contestant con ON tm.contestantId = con.id
      JOIN eventcontestteam ect ON t.id = ect.teamId
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      WHERE 
        ec.eventId = ${eventId} 
        AND ect.status = 'PENDING'
        AND EXISTS (
          SELECT 1
          FROM teamMember tm2
          JOIN team t2 ON tm2.teamId = t2.id
          JOIN eventcontestteam ect2 ON t2.id = ect2.teamId
          JOIN eventcontest ec2 ON ect2.eventcontestId = ec2.id
          WHERE 
            ec2.eventId = ${eventId}
            AND tm2.contestantId = tm.contestantId
            AND t2.id <> t.id
        )
    ` as any[];
    
    // Count teams with age mismatches
    const ageMismatchesQuery = await prisma.$queryRaw`
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
    
    // Prepare data for detecting duplicates and age mismatches in sample teams
    // This is a common table expression (CTE) approach but done through separate queries
    
    // Get teams with duplicate members
    const teamsWithDuplicates = await prisma.$queryRaw`
      SELECT DISTINCT t.id
      FROM team t
      JOIN teamMember tm ON t.id = tm.teamId
      JOIN eventcontestteam ect ON t.id = ect.teamId
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      WHERE 
        ec.eventId = ${eventId} 
        AND ect.status = 'PENDING'
        AND EXISTS (
          SELECT 1
          FROM teamMember tm2
          JOIN team t2 ON tm2.teamId = t2.id
          JOIN eventcontestteam ect2 ON t2.id = ect2.teamId
          JOIN eventcontest ec2 ON ect2.eventcontestId = ec2.id
          WHERE 
            ec2.eventId = ${eventId}
            AND tm2.contestantId = tm.contestantId
            AND t2.id <> t.id
        )
      LIMIT 100
    ` as any[];
    
    // Create a set of team IDs with duplicates for faster lookup
    const duplicateTeamIds = new Set((teamsWithDuplicates || []).map((t: any) => t.id));
    
    // Get teams with age mismatches
    const teamsWithAgeMismatches = await prisma.$queryRaw`
      SELECT DISTINCT t.id 
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
      LIMIT 100
    ` as any[];
    
    // Create a set of team IDs with age mismatches for faster lookup
    const ageMismatchTeamIds = new Set((teamsWithAgeMismatches || []).map((t: any) => t.id));
    
    // Get sample pending teams for display
    const sampleTeamsRaw = await prisma.$queryRaw`
      SELECT 
        t.id, 
        t.name, 
        t.team_email,
        COUNT(tm.contestantId) as memberCount,
        c.name as contestName
      FROM team t
      LEFT JOIN teamMember tm ON t.id = tm.teamId
      JOIN eventcontestteam ect ON t.id = ect.teamId
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN contest c ON ec.contestId = c.id
      WHERE ec.eventId = ${eventId} AND ect.status = 'PENDING'
      GROUP BY t.id, t.name, t.team_email, c.name
      LIMIT 10
    ` as any[];
    
    // Enhanced processing for each team to determine eligibility factors
    const sampleTeams = sampleTeamsRaw.map((team: any) => {
      // 1. Check if team has members
      const memberCount = parseInt(team.memberCount) || 0;
      const hasMemberIssue = memberCount === 0;
      
      // 2. Check email format (simplified check - just presence)
      const emailStatus = !team.team_email || team.team_email.trim() === '' ? 'missing' : 
                         /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(team.team_email) ? 'valid' : 'invalid';
      
      // 3. Check if team has duplicate members (using the set we created)
      const hasDuplicateMembers = duplicateTeamIds.has(team.id) ? 'yes' : 'no';
      
      // 4. Check if team has age mismatches (using the set we created)
      const hasAgeMismatch = ageMismatchTeamIds.has(team.id) ? 'yes' : 'no';
      
      // Overall eligibility status and reason
      let isEligible = !hasMemberIssue && 
                      emailStatus === 'valid' && 
                      hasDuplicateMembers === 'no' && 
                      hasAgeMismatch === 'no';
                      
      let failureReason = 'All criteria met';
      if (hasMemberIssue) failureReason = 'No members';
      else if (emailStatus !== 'valid') failureReason = 'Invalid email';
      else if (hasDuplicateMembers === 'yes') failureReason = 'Duplicate members';
      else if (hasAgeMismatch === 'yes') failureReason = 'Age mismatch';
      
      return {
        id: team.id,
        teamName: team.name,
        teamEmail: team.team_email,
        emailStatus: emailStatus,
        memberCount: memberCount,
        hasDuplicateMembers: hasDuplicateMembers,
        hasAgeMismatch: hasAgeMismatch,
        contestName: team.contestName || 'Unknown',
        eligibilityStatus: isEligible ? 'eligible' : 'ineligible',
        failureReason: failureReason
      };
    });

    // Calculate the eligible count (approximation)
    // Teams eligible = Total pending - (invalid emails + empty teams + duplicates + age mismatches)
    const invalidEmailsValue = Number(invalidEmailsCount[0]?.count || 0);
    const emptyTeamsValue = Array.isArray(emptyTeamsCount) ? emptyTeamsCount.length : 0;
    const duplicatesValue = Number(duplicatesCountQuery[0]?.count || 0);
    const ageMismatchesValue = Number(ageMismatchesQuery[0]?.count || 0);
    
    // This is approximate and may double-count some teams that have multiple issues
    const eligibleTeamsEstimate = Math.max(
      0, 
      totalPendingCountResult - (invalidEmailsValue + emptyTeamsValue + duplicatesValue + ageMismatchesValue)
    );
    
    // Log the counts for debugging
    console.log('Diagnostic counts:', {
      totalPending: totalPendingCountResult,
      invalidEmails: invalidEmailsValue,
      emptyTeams: emptyTeamsValue,
      duplicates: duplicatesValue,
      ageMismatches: ageMismatchesValue,
      eligibleEstimate: eligibleTeamsEstimate
    });
    
    // Return diagnostic information with the additional counts
    return NextResponse.json({
      event: event.name,
      summary: {
        totalPendingCount: totalPendingCountResult,
        eligibleCount: eligibleTeamsEstimate,
        teamsWithNoMembersCount: emptyTeamsValue,
        teamsWithInvalidEmailsCount: invalidEmailsValue,
        teamsWithDuplicateMembersCount: duplicatesValue,
        teamsWithAgeMismatchesCount: ageMismatchesValue,
        note: "Improved diagnostic with age mismatch detection"
      },
      sampleTeams,
      filters: {
        emailRegex: '^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
        hasMemberCheck: 'memberCount > 0',
        duplicateLogic: 'Find contestants who are in multiple teams across ALL contests'
      }
    });
  } catch (error) {
    console.error("Error running diagnostic:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    
    // Create a simplified response with just basic information
    try {
      // We need to re-extract eventId from params since we're in a new scope
      const eventId = parseInt(params.eventId);
      if (isNaN(eventId)) {
        return NextResponse.json({ 
          error: "Failed to run diagnostic - invalid event ID",
          details: error instanceof Error ? error.message : String(error)
        }, { status: 400 });
      }
      
      // Attempt to get only the total count of pending teams as a fallback
      // Using Prisma API instead of raw query for reliability
      const pendingCount = await prisma.eventcontestteam.count({
        where: {
          eventcontest: {
            eventId: eventId
          },
          status: 'PENDING'
        }
      });
      
      return NextResponse.json({
        error: "Partial diagnostic only - some queries failed",
        summary: {
          totalPendingCount: pendingCount,
          eligibleCount: -1, // Unable to determine
          errorDetails: error instanceof Error ? error.message : String(error)
        }
      });
    } catch (fallbackError) {
      // If even the fallback fails, return a clear error
      return NextResponse.json(
        { 
          error: "Failed to run diagnostic",
          details: error instanceof Error ? error.message : String(error),
          suggestion: "Please check server logs for detailed error information"
        },
        { status: 500 }
      );
    }
  }
}
