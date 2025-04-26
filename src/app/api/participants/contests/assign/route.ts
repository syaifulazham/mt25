import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

// POST /api/participants/contests/assign - Bulk assign contests to contestants based on age criteria
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get the participant user
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Get managed contingents
    const managedContingents = await prisma.contingentManager.findMany({
      where: {
        participantId: participant.id
      },
      select: {
        contingentId: true
      }
    });
    
    // Also check legacy relationship
    const legacyContingents = await prisma.contingent.findMany({
      where: {
        managedByParticipant: true,
        participantId: participant.id
      },
      select: {
        id: true
      }
    });
    
    // Combine both types of managed contingents
    const contingentIds = [
      ...managedContingents.map(c => c.contingentId),
      ...legacyContingents.map(c => c.id)
    ];
    
    if (contingentIds.length === 0) {
      return NextResponse.json({ error: "No managed contingents found" }, { status: 404 });
    }
    
    // Get all contestants from managed contingents
    const contestants = await prisma.contestant.findMany({
      where: {
        contingentId: {
          in: contingentIds
        }
      }
    });
    
    if (contestants.length === 0) {
      return NextResponse.json({ error: "No contestants found" }, { status: 404 });
    }
    
    // Get all available contests with their target groups
    const contests = await prisma.contest.findMany({
      include: {
        targetgroup: true
      }
    });
    
    // Track created assignments
    const createdAssignments = [];
    const errors = [];
    
    // For each contestant, assign eligible contests
    for (const contestant of contestants) {
      // Filter contests based on age criteria from target groups
      const eligibleContests = contests.filter(contest => {
        // If contest has no target groups, consider it eligible for all
        if (!contest.targetgroup || contest.targetgroup.length === 0) return true;
        
        // Check if contestant's age matches any of the contest's target groups
        return contest.targetgroup.some(group => {
          // Check if contestant's age is within target group's age range
          const isAboveMinAge = contestant.age >= group.minAge;
          const isBelowMaxAge = group.maxAge === 0 || contestant.age <= group.maxAge;
          
          return isAboveMinAge && isBelowMaxAge;
        });
      });
      
      // Create participation records for eligible contests
      for (const contest of eligibleContests) {
        try {
          // Check if participation already exists
          const existingParticipation = await prisma.contestParticipation.findUnique({
            where: {
              contestId_contestantId: {
                contestId: contest.id,
                contestantId: contestant.id
              }
            }
          });
          
          // Skip if already assigned
          if (existingParticipation) continue;
          
          // Create new participation
          const participation = await prisma.contestParticipation.create({
            data: {
              contestId: contest.id,
              contestantId: contestant.id,
              status: "REGISTERED",
              notes: `Auto-assigned based on age criteria (${contestant.age} years)`
            }
          });
          
          createdAssignments.push(participation);
        } catch (error) {
          console.error(`Error assigning contestant ${contestant.id} to contest ${contest.id}:`, error);
          errors.push({
            contestantId: contestant.id,
            contestId: contest.id,
            error: (error as Error).message
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      assignmentsCreated: createdAssignments.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("Error in bulk contest assignment:", error);
    return NextResponse.json(
      { error: "Failed to assign contests" },
      { status: 500 }
    );
  }
}
