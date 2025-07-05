import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";

const db = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get teamId from query params
    const url = new URL(req.url);
    const teamId = url.searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Get team with contest info to check target age range
    const team = await db.team.findUnique({
      where: {
        id: parseInt(teamId)
      },
      include: {
        contest: {
          select: {
            id: true,
            targetgroup: {
              select: {
                minAge: true,
                maxAge: true
              }
            }
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Find the team members
    const teamMembers = await db.teamMember.findMany({
      where: { 
        teamId: parseInt(teamId),
        team: {
          managers: {
            some: {
              participantId: Number(session.user.id)
            }
          }
        }
      },
      include: {
        contestant: {
          select: {
            id: true,
            name: true,
            age: true,
            class_grade: true
          }
        }
      }
    });
    
    // For each team member, check if they are in multiple teams
    const contestantIds = teamMembers.map(tm => tm.contestantId);
    
    // Find all teams that these contestants are part of
    const contestantsWithMultipleTeams = await db.contestant.findMany({
      where: {
        id: { in: contestantIds }
      },
      select: {
        id: true,
        teamMembers: {
          select: {
            teamId: true
          }
        }
      }
    });
    
    // Create a map of contestant IDs to their team count
    const contestantTeamCountMap: { [key: number]: number } = {};
    contestantsWithMultipleTeams.forEach((contestant: any) => {
      contestantTeamCountMap[contestant.id] = contestant.teamMembers.length;
    });

    // Get contest age range from target groups
    let minAge = 100; // Start with high value
    let maxAge = 0;   // Start with low value
    
    // If no target groups are defined or team/contest is missing, use default range
    if (!team?.contest?.targetgroup || team.contest.targetgroup.length === 0) {
      minAge = 0;
      maxAge = 100;
    } else {
      // Find the most inclusive age range across all target groups
      team.contest.targetgroup.forEach((tg: any) => {
        if (tg.minAge < minAge) minAge = tg.minAge;
        if (tg.maxAge > maxAge) maxAge = tg.maxAge;
      });
    }

    // Format the response
    const formattedMembers = teamMembers.map((member: any) => {
      const memberAge = parseInt(member.contestant.age) || 0;
      
      return {
        id: member.contestant.id,
        name: member.contestant.name,
        role: member.role,
        age: String(member.contestant.age), // Include age as string
        class_grade: member.contestant.class_grade || '-', // Include class_grade with fallback
        inMultipleTeams: contestantTeamCountMap[member.contestantId] > 1,
        mismatchContest: memberAge < minAge || memberAge > maxAge // Check if age is outside target range
      };
    });

    return NextResponse.json(formattedMembers);
    
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
