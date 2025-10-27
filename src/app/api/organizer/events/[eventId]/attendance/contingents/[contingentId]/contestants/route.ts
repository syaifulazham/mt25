import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth-options";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string; contingentId: string } }
) {
  // Extract IDs outside try block for error logging
  const eventId = Number(params.eventId);
  const contingentId = Number(params.contingentId);
  
  try {
    // Development mode authentication bypass
    let isDevelopmentMode = process.env.NODE_ENV === 'development';
    let isMockAuthEnabled = process.env.MOCK_AUTH === 'true';
    let mockSession = null;
    
    if (isDevelopmentMode && isMockAuthEnabled) {
      console.log('Using mock authentication for development');
      mockSession = {
        user: {
          id: '1',
          name: 'Development User',
          email: 'dev@techlympics.com',
          role: 'ADMIN',
          username: 'devuser'
        }
      };
    }
    
    // Check for valid session with required roles
    const session = mockSession || await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session?.user?.role;
    if (!["ADMIN", "OPERATOR"].includes(userRole || '')) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    if (isNaN(eventId) || isNaN(contingentId)) {
      return NextResponse.json(
        { error: "Invalid event ID or contingent ID" },
        { status: 400 }
      );
    }

    // Get all contestants from attendanceContestant for this contingent and event
    const contestants = await prisma.$queryRaw`
      SELECT 
        ac.id as attendanceContestantId,
        ac.contestantId,
        ac.state as attendanceState,
        c.name as contestantName,
        c.ic as contestantIc,
        c.gender as contestantGender,
        c.age as contestantAge,
        t.id as teamId,
        t.name as teamName,
        ec.contestId,
        contest.name as contestName
      FROM attendanceContestant ac
      LEFT JOIN contestant c ON ac.contestantId = c.id
      LEFT JOIN team t ON ac.teamId = t.id
      LEFT JOIN eventcontestteam ect ON t.id = ect.teamId
      LEFT JOIN eventcontest ec ON ect.eventcontestId = ec.id
      LEFT JOIN contest ON ec.contestId = contest.id
      WHERE ac.eventId = ${eventId}
      AND (t.contingentId = ${contingentId} OR ac.contingentId = ${contingentId})
      ORDER BY c.name ASC
    `;
    
    // Process the results and handle potential null values
    const processedContestants = Array.isArray(contestants) 
      ? contestants.map(c => ({
          attendanceContestantId: c.attendanceContestantId ? Number(c.attendanceContestantId) : null,
          contestantId: c.contestantId ? Number(c.contestantId) : null,
          attendanceState: c.attendanceState || 'Unknown',
          contestantName: c.contestantName || 'Unknown',
          contestantIc: c.contestantIc || '-',
          contestantGender: c.contestantGender || '-',
          contestantAge: c.contestantAge ? Number(c.contestantAge) : null,
          teamId: c.teamId ? Number(c.teamId) : null,
          teamName: c.teamName || 'Unknown Team',
          contestId: c.contestId ? Number(c.contestId) : null,
          contestName: c.contestName || 'Unknown Contest'
        }))
      : [];

    return NextResponse.json({ 
      contestants: processedContestants,
      count: processedContestants.length
    });
  } catch (error) {
    console.error("Error fetching contestants:", error);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error(`Query params: eventId=${eventId}, contingentId=${contingentId}`);
    return NextResponse.json(
      { error: "Failed to fetch contestants", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
