import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Default theme color to use if no theme is specified
const DEFAULT_THEME_COLOR = "#0070f3";

// GET /api/participants/contests/with-target-groups - Get all contests with their target groups
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/participants/contests/with-target-groups - Request received");

    // Fetch all target groups
    const targetGroups = await prisma.targetgroup.findMany();
    console.log(`Found ${targetGroups.length} target groups`);

    // Fetch all contests with their target groups and themes
    const contests = await prisma.contest.findMany({
      where: {
        accessibility: true // Only fetch public contests
      },
      include: {
        targetgroup: true,
        theme: true
      }
    });
    console.log(`Found ${contests.length} contests`);

    // Format the results
    const formattedContests = contests.map(contest => ({
      id: contest.id,
      name: contest.name,
      code: contest.code,
      description: contest.description,
      contestType: contest.contestType,
      startDate: contest.startDate,
      endDate: contest.endDate,
      participation_mode: contest.participation_mode,
      targetGroups: contest.targetgroup,
      theme: {
        id: contest.theme?.id,
        name: contest.theme?.name,
        color: contest.theme?.color || DEFAULT_THEME_COLOR,
        logoPath: contest.theme?.logoPath
      }
    }));

    // Group contests by target group
    const contestsByTargetGroup = targetGroups.map(targetGroup => {
      const contestsForGroup = formattedContests.filter(contest => 
        contest.targetGroups.some(tg => tg.id === targetGroup.id)
      );
      
      return {
        targetGroup,
        contests: contestsForGroup
      };
    }).filter(group => group.contests.length > 0); // Only include groups with contests

    return NextResponse.json(contestsByTargetGroup);
  } catch (error) {
    console.error("Error fetching contests with target groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch contests" },
      { status: 500 }
    );
  }
}
