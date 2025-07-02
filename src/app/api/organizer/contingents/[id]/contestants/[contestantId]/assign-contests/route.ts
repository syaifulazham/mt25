import { NextRequest, NextResponse } from "next/server";
import { prismaExecute } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

// Force dynamic rendering - required for routes that use cookies
export const dynamic = 'force-dynamic';

// GET handler to fetch eligible contests for a contestant
export async function GET(request: NextRequest, { params }: { params: { id: string, contestantId: string } }) {
  try {
    // Use NextAuth session authentication (same pattern as other working organizer APIs)
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify that the user is an organizer with appropriate role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!user || !['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const contingentId = parseInt(params.id);
    const contestantId = parseInt(params.contestantId);

    if (isNaN(contingentId) || isNaN(contestantId)) {
      return NextResponse.json({ error: "Invalid contingent or contestant ID" }, { status: 400 });
    }

    // Get the contestant data
    const contestant = await prismaExecute(prisma =>
      prisma.contestant.findUnique({
        where: { id: contestantId },
        select: {
          id: true,
          name: true,
          birthdate: true,
          age: true,
          contingentId: true
        },
      })
    );

    if (!contestant) {
      return NextResponse.json({ error: "Contestant not found" }, { status: 404 });
    }

    // Verify contestant belongs to contingent
    if (contestant.contingentId !== contingentId) {
      return NextResponse.json(
        { error: "Contestant does not belong to this contingent" },
        { status: 403 }
      );
    }

    // Get all contests with their target groups
    const contests = await prismaExecute(prisma =>
      prisma.contest.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          targetgroup: {
            select: {
              id: true,
              minAge: true,
              maxAge: true,
              name: true
            }
          }
        },
        where: {
          accessibility: true, // Only accessible contests
        },
        orderBy: { name: "asc" },
      })
    );

    // Get contestant's already assigned contests
    const contestParticipations = await prismaExecute(prisma =>
      prisma.contestParticipation.findMany({
        where: { contestantId },
        select: {
          contestId: true,
        },
      })
    );

    const assignedContestIds = new Set(
      contestParticipations.map(participation => participation.contestId)
    );

    // Use contestant age directly from the database
    const contestantAge = contestant.age ?? null;

    // Determine eligibility and filter to only include eligible contests
    const eligibleContests = contests
      .map(contest => {
        // Check if contestant age is within any of the contest's target group age ranges
        let isEligible = false;
        
        // If contest has no target groups, consider it eligible
        if (!contest.targetgroup || contest.targetgroup.length === 0) {
          isEligible = true;
        }
        // Otherwise check each target group's age range
        else if (contestantAge !== null) {
          // Check if contestant age matches any of the target groups
          isEligible = contest.targetgroup.some(targetGroup => {
            // If minAge and maxAge are defined, check if contestant is within range
            if (targetGroup.minAge !== null && targetGroup.maxAge !== null) {
              return contestantAge >= targetGroup.minAge && contestantAge <= targetGroup.maxAge;
            }
            // If only minAge is defined, check if contestant is at least that age
            else if (targetGroup.minAge !== null) {
              return contestantAge >= targetGroup.minAge;
            }
            // If only maxAge is defined, check if contestant is at most that age
            else if (targetGroup.maxAge !== null) {
              return contestantAge <= targetGroup.maxAge;
            }
            // If no age restrictions in this target group, contestant is eligible
            else {
              return true;
            }
          });
        } else {
          // If no age info for contestant, default to eligible
          isEligible = true;
        }
        
        return {
          id: contest.id,
          name: contest.name,
          description: contest.description,
          targetGroups: contest.targetgroup.map(tg => tg.name),
          isAssigned: assignedContestIds.has(contest.id),
          isEligible
        };
      })
      // Only include contests where the contestant is eligible
      .filter(contest => contest.isEligible);

    return NextResponse.json({
      contestant: {
        id: contestant.id,
        name: contestant.name,
        age: contestantAge,
      },
      eligibleContests,
    });
  } catch (error) {
    console.error("Error fetching eligible contests:", error);
    return NextResponse.json(
      { error: "Failed to fetch eligible contests" },
      { status: 500 }
    );
  }
}

// POST handler to update contest assignments
export async function POST(request: NextRequest, { params }: { params: { id: string, contestantId: string } }) {
  try {
    // Use NextAuth session authentication (same pattern as other working organizer APIs)
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify that the user is an organizer with appropriate role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!user || !['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const contingentId = parseInt(params.id);
    const contestantId = parseInt(params.contestantId);

    if (isNaN(contingentId) || isNaN(contestantId)) {
      return NextResponse.json({ error: "Invalid contingent or contestant ID" }, { status: 400 });
    }

    // Get request body
    const { contestIds } = await request.json();

    if (!Array.isArray(contestIds)) {
      return NextResponse.json(
        { error: "Invalid request body. Expected contestIds array" },
        { status: 400 }
      );
    }

    // Verify contestant belongs to contingent
    const contestant = await prismaExecute(prisma =>
      prisma.contestant.findFirst({
        where: {
          id: contestantId,
          contingentId: contingentId,
        },
      })
    );

    if (!contestant) {
      return NextResponse.json(
        { error: "Contestant not found or does not belong to this contingent" },
        { status: 404 }
      );
    }

    // Get currently assigned contests
    const currentParticipations = await prismaExecute(prisma =>
      prisma.contestParticipation.findMany({
        where: { contestantId },
        select: { contestId: true },
      })
    );

    const currentContestIds = currentParticipations.map(p => p.contestId);
    
    // Determine contests to add and remove
    const contestsToAdd = contestIds.filter(id => !currentContestIds.includes(id));
    const contestsToRemove = currentContestIds.filter(id => !contestIds.includes(id));

    // Update contest participations in a transaction
    const result = await prismaExecute(async (prisma) => {
      // Delete removed participations
      if (contestsToRemove.length > 0) {
        await prisma.contestParticipation.deleteMany({
          where: {
            contestantId,
            contestId: { in: contestsToRemove },
          },
        });
      }

      // Add new participations
      if (contestsToAdd.length > 0) {
        await prisma.$transaction(
          contestsToAdd.map(contestId =>
            prisma.contestParticipation.create({
              data: {
                contestId,
                contestantId,
                registeredAt: new Date(),
                status: "REGISTERED",
              },
            })
          )
        );
      }

      return { added: contestsToAdd.length, removed: contestsToRemove.length };
    });

    return NextResponse.json({
      message: "Contest assignments updated successfully",
      ...result,
    });
  } catch (error) {
    console.error("Error updating contest assignments:", error);
    return NextResponse.json(
      { error: "Failed to update contest assignments" },
      { status: 500 }
    );
  }
}
