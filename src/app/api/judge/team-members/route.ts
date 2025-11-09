import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    
    if (!teamId) {
      return NextResponse.json(
        { error: "Missing required teamId parameter" },
        { status: 400 }
      );
    }

    // Parse the team ID to number
    const parsedTeamId = parseInt(teamId);

    // Define the expected return type from the raw query
    interface TeamMemberResult {
      contestantId: number;
      name: string;
    }
    
    // Get team members by querying attendance team contestants
    const teamMembers = await prisma.$queryRaw<TeamMemberResult[]>`
      SELECT DISTINCT ac.contestantId, c.name
      FROM attendanceContestant ac
      JOIN contestant c ON ac.contestantId = c.id
      WHERE ac.teamId = ${parsedTeamId}
    `;
    
    console.log(`Found ${teamMembers.length} team members for team ID ${parsedTeamId}`);

    // Format the results
    const formattedMembers = teamMembers.map((member) => ({
      id: member.contestantId,
      name: member.name,
      contestantId: member.contestantId,
    }));

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}
