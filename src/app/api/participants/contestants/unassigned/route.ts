import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prismaExecute } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/auth-options";
import { Prisma } from "@prisma/client";

// This route uses dynamic features and cannot be statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // First, find all managed contingents for this user
    const userContingents = await prismaExecute(prisma => 
      prisma.contingentManager.findMany({
        where: {
          participantId: userId,
        },
        select: {
          contingentId: true,
        },
      })
    );

    const managedContingentIds = userContingents.map(c => c.contingentId);

    // Early return if no contingents are managed
    if (managedContingentIds.length === 0) {
      return NextResponse.json({ 
        totalContestants: 0,
        unassignedContestants: 0,
        hasUnassignedContestants: false 
      });
    }

    // Find all contestants from managed contingents
    const contestantsCount = await prismaExecute(prisma => 
      prisma.contestant.count({
        where: {
          contingentId: {
            in: managedContingentIds
          }
        }
      })
    );

    // Find contestants with no contest participation
    const contestantsWithNoContestCount = await prismaExecute(async prisma => {
      // First let's log all the contestants for debugging
      const allContestants = await prisma.contestant.findMany({
        where: {
          contingentId: {
            in: managedContingentIds
          }
        },
        select: {
          id: true,
          name: true,
          contingentId: true
        }
      });
      
      console.log(`Found ${allContestants.length} contestants:`, 
        allContestants.map(c => ({ id: c.id, name: c.name })));
      
      // Get contestants who are not in the contest participation table using a more reliable method
      // First get all contestant IDs that have contest participation
      const contestantsWithParticipation = await prisma.contestParticipation.findMany({
        where: {
          contestant: {
            contingentId: {
              in: managedContingentIds
            }
          }
        },
        select: {
          contestantId: true
        },
        distinct: ['contestantId']
      });
      
      const participatingIds = contestantsWithParticipation.map(p => p.contestantId);
      console.log(`Found ${participatingIds.length} contestants with participations:`, participatingIds);
      
      // Then find contestants that don't have any contest participation
      const contestantsWithNoParticipation = await prisma.contestant.findMany({
        where: {
          AND: [
            { contingentId: { in: managedContingentIds } },
            { id: { notIn: participatingIds.length > 0 ? participatingIds : [-1] } }
          ]
        }
      });
      
      console.log(`Found ${contestantsWithNoParticipation.length} contestants with NO participations:`, 
        contestantsWithNoParticipation.map(c => ({ id: c.id, name: c.name })));
        
      return contestantsWithNoParticipation.length;
    });

    // Always set hasUnassignedContestants to true if we have unassigned contestants
    // regardless of the total count (which should be at least equal to unassigned count)
    const hasUnassigned = contestantsWithNoContestCount > 0;
    
    console.log('API response data:', {
      totalContestants: contestantsCount,
      unassignedContestants: contestantsWithNoContestCount,
      hasUnassignedContestants: hasUnassigned
    });
    
    return NextResponse.json({
      totalContestants: contestantsCount,
      unassignedContestants: contestantsWithNoContestCount,
      hasUnassignedContestants: hasUnassigned
    });
  } catch (error) {
    console.error("Error checking unassigned contestants:", error);
    return NextResponse.json(
      { error: "Failed to check unassigned contestants" },
      { status: 500 }
    );
  }
}
