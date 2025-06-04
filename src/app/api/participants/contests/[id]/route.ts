export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma, { prismaExecute } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// GET /api/participants/contests/[id] - Get contest details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contestId = parseInt(params.id);
    if (isNaN(contestId)) {
      return NextResponse.json({ error: "Invalid contest ID" }, { status: 400 });
    }

    console.log(`GET /api/participants/contests/${contestId} - Request received`);

    // Get contest details with target group information
    const contest = await prismaExecute(async (prisma: any) => {
      return await prisma.contest.findUnique({
        where: { id: contestId },
        include: {
          targetgroup: true,
          theme: true,
        }
      });
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    console.log(`Successfully found contest: ${contest.name}`);

    // Format the response
    const response = {
      id: contest.id,
      name: contest.name,
      description: contest.description,
      targetgroup: contest.targetgroup,
      theme: contest.theme,
      minAge: contest.min_age,
      maxAge: contest.max_age,
      targetGroup: contest.targetgroup ? {
        id: contest.targetgroup.id,
        name: contest.targetgroup.name,
        description: contest.targetgroup.description
      } : null
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error fetching contest ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch contest details" },
      { status: 500 }
    );
  }
}
