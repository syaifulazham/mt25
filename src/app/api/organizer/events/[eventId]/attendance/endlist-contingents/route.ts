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

    // Check if user is an organizer admin or operator
    if (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Fetch contingents that have teams in the endlist (with APPROVED/ACCEPTED status)
    const contingents = await prisma.$queryRaw`
      SELECT DISTINCT
        c.id,
        c.name,
        c.contingentType,
        CASE 
          WHEN c.contingentType = 'SCHOOL' THEN s.name
          WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN hi.name
          WHEN c.contingentType = 'INDEPENDENT' THEN i.name
          ELSE 'Unknown'
        END as institutionName,
        CASE 
          WHEN c.contingentType = 'SCHOOL' THEN st_s.name
          WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN st_hi.name
          WHEN c.contingentType = 'INDEPENDENT' THEN st_i.name
          ELSE 'Unknown State'
        END as stateName,
        COUNT(DISTINCT t.id) as teamCount,
        COUNT(DISTINCT tm.contestantId) as contestantCount
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      JOIN contingent c ON t.contingentId = c.id
      LEFT JOIN teamMember tm ON tm.teamId = t.id
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
      LEFT JOIN independent i ON c.independentId = i.id
      LEFT JOIN state st_s ON s.stateId = st_s.id
      LEFT JOIN state st_hi ON hi.stateId = st_hi.id
      LEFT JOIN state st_i ON i.stateId = st_i.id
      WHERE ec.eventId = ${eventId}
        AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
      GROUP BY c.id, c.name, c.contingentType, institutionName, stateName
      ORDER BY stateName, c.name ASC
    ` as any[];

    // Check attendance sync status for each contingent
    const contingentsWithStatus = await Promise.all(
      contingents.map(async (contingent) => {
        // Check if this contingent is already synced to attendance
        const attendanceRecord = await prisma.$queryRaw`
          SELECT COUNT(*) as count, MAX(updatedAt) as lastSyncDate FROM attendanceContingent 
          WHERE contingentId = ${contingent.id} AND eventId = ${eventId}
        ` as any[];

        // Count all synced teams for this contingent (no age validation filtering)
        const attendanceTeamCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM attendanceTeam at
          WHERE at.contingentId = ${contingent.id} 
            AND at.eventId = ${eventId}
        ` as any[];

        // Get the count of all approved teams without age validation filtering
        const syncableTeamsCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM eventcontestteam ect
          JOIN eventcontest ec ON ect.eventcontestId = ec.id
          JOIN team t ON ect.teamId = t.id
          JOIN contingent c ON t.contingentId = c.id
          WHERE ec.eventId = ${eventId}
            AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
            AND c.id = ${contingent.id}
        ` as any[];

        const isSynced = Number(attendanceRecord[0]?.count || 0) > 0;
        const syncedTeamCount = Number(attendanceTeamCount[0]?.count || 0);
        const actualSyncableTeamCount = Number(syncableTeamsCount[0]?.count || 0);
        
        // TEMPORARY FIX: Show all contingents that have approved teams as needing sync
        // This ensures all contingents appear in the sync list until a full resync is done
        // Only mark contingent as not needing sync if it has the exact same number of synced teams as approved teams
        const teamsExactlyMatch = syncedTeamCount === actualSyncableTeamCount && syncedTeamCount > 0;
        
        // Always show contingents with approved teams, unless the counts exactly match
        const needsSync = actualSyncableTeamCount > 0 && !teamsExactlyMatch;
        
        // Log detailed info for troubleshooting
        console.log(`Contingent ${contingent.name} (${contingent.id}): syncedTeamCount=${syncedTeamCount}, actualSyncableTeamCount=${actualSyncableTeamCount}, isSynced=${isSynced}, needsSync=${needsSync}`);
        
        if (syncedTeamCount < actualSyncableTeamCount && actualSyncableTeamCount > 0) {
          console.log(`Contingent ${contingent.name} (${contingent.id}): needs sync - ${syncedTeamCount}/${actualSyncableTeamCount} teams synced`);
        } else if (actualSyncableTeamCount === 0) {
          console.log(`Contingent ${contingent.name} (${contingent.id}): has no syncable teams due to age validation or other criteria`);
        }

        return {
          id: Number(contingent.id),
          name: contingent.name,
          contingentType: contingent.contingentType,
          institutionName: contingent.institutionName,
          stateName: contingent.stateName,
          teamCount: actualSyncableTeamCount, // Use actual syncable team count instead of raw count
          contestantCount: Number(contingent.contestantCount),
          isSynced,
          syncedTeamCount,
          needsSync,
          lastSyncDate: attendanceRecord[0]?.lastSyncDate || null
        };
      })
    );

    return NextResponse.json({
      success: true,
      contingents: contingentsWithStatus
    });
    
  } catch (error) {
    console.error("Error fetching endlist contingents:", error);
    return NextResponse.json(
      { error: "Failed to fetch contingents data" },
      { status: 500 }
    );
  }
}
