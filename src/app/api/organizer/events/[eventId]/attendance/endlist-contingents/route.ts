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
          SELECT COUNT(*) as count FROM attendanceContingent 
          WHERE contingentId = ${contingent.id} AND eventId = ${eventId}
        ` as any[];

        const attendanceTeamCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM attendanceTeam 
          WHERE contingentId = ${contingent.id} AND eventId = ${eventId}
        ` as any[];

        // Get the actual count of teams that would be synced (applying same filtering as sync API)
        const syncableTeamsCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM eventcontestteam ect
          JOIN eventcontest ec ON ect.eventcontestId = ec.id
          JOIN team t ON ect.teamId = t.id
          JOIN contingent c ON t.contingentId = c.id
          JOIN contest team_contest ON t.contestId = team_contest.id
          JOIN contest ct ON ec.contestId = ct.id
          JOIN _contesttotargetgroup ctg ON ctg.A = ct.id
          JOIN targetgroup tg ON tg.id = ctg.B
          WHERE ec.eventId = ${eventId}
            AND ect.status IN ('APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL')
            AND c.id = ${contingent.id}
            AND (
              ect.status = 'APPROVED_SPECIAL' OR
              NOT EXISTS (
                SELECT 1 FROM teamMember tm 
                JOIN contestant con ON tm.contestantId = con.id 
                WHERE tm.teamId = t.id 
                AND (
                  con.age IS NULL OR 
                  tg.minAge IS NULL OR 
                  tg.maxAge IS NULL OR 
                  CAST(con.age AS SIGNED) < CAST(tg.minAge AS SIGNED) OR 
                  CAST(con.age AS SIGNED) > CAST(tg.maxAge AS SIGNED)
                )
              )
            )
        ` as any[];

        const isSynced = Number(attendanceRecord[0]?.count || 0) > 0;
        const syncedTeamCount = Number(attendanceTeamCount[0]?.count || 0);
        const actualSyncableTeamCount = Number(syncableTeamsCount[0]?.count || 0);
        const needsSync = !isSynced || syncedTeamCount < actualSyncableTeamCount;

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
          needsSync
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
