import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// POST /api/participants/contestants/[id]/assign-contests - Assign contests to a specific contestant
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const contestantId = parseInt(params.id);
    
    if (isNaN(contestantId)) {
      return NextResponse.json(
        { error: "Invalid contestant ID" },
        { status: 400 }
      );
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
    
    // Get the contestant and verify they belong to a managed contingent
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId }
    });
    
    if (!contestant) {
      return NextResponse.json({ error: "Contestant not found" }, { status: 404 });
    }
    
    // Check if contestant belongs to a managed contingent
    if (!contingentIds.includes(contestant.contingentId)) {
      return NextResponse.json(
        { error: "You don't have permission to manage this contestant" },
        { status: 403 }
      );
    }
    
    // Parse request body
    const { contestIds } = await request.json();
    
    if (!Array.isArray(contestIds)) {
      return NextResponse.json(
        { error: "Invalid request body. Expected contestIds array." },
        { status: 400 }
      );
    }
    
    // Track created assignments
    const createdAssignments = [];
    const errors = [];
    
    // Create participation records for each contest
    for (const contestId of contestIds) {
      try {
        // Check if participation already exists
        const existingParticipation = await prisma.contestParticipation.findUnique({
          where: {
            contestId_contestantId: {
              contestId,
              contestantId
            }
          }
        });
        
        // Skip if already assigned
        if (existingParticipation) continue;
        
        // Create new participation
        const participation = await prisma.contestParticipation.create({
          data: {
            contestId,
            contestantId,
            status: "REGISTERED",
            notes: `Manually assigned by ${participant.name || participant.email}`
          }
        });
        
        createdAssignments.push(participation);
      } catch (error) {
        console.error(`Error assigning contestant ${contestantId} to contest ${contestId}:`, error);
        errors.push({
          contestId,
          error: (error as Error).message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      assignmentsCreated: createdAssignments.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("Error in individual contest assignment:", error);
    return NextResponse.json(
      { error: "Failed to assign contests" },
      { status: 500 }
    );
  }
}

// GET /api/participants/contestants/[id]/assign-contests - Get eligible contests for a contestant
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const contestantId = parseInt(params.id);
    
    if (isNaN(contestantId)) {
      return NextResponse.json(
        { error: "Invalid contestant ID" },
        { status: 400 }
      );
    }
    
    // Get the contestant
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId }
    });
    
    if (!contestant) {
      return NextResponse.json({ error: "Contestant not found" }, { status: 404 });
    }
    
    // Get the contestant's contest participations
    const contestParticipations = await prisma.contestParticipation.findMany({
      where: { contestantId },
      include: {
        contest: true
      }
    });
    
    if (!contestant) {
      return NextResponse.json({ error: "Contestant not found" }, { status: 404 });
    }
    
    // Get all available contests with their target groups
    const allContests = await prisma.contest.findMany({
      include: {
        targetgroup: true
      }
    });
    
    // Filter contests based on age criteria from target groups
    const eligibleContests = allContests.filter(contest => {
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
    
    // Get already assigned contests
    const assignedContestIds = contestParticipations.map(p => p.contestId);
    
    // Mark contests as assigned or not
    const contestsWithStatus = eligibleContests.map(contest => ({
      ...contest,
      isAssigned: assignedContestIds.includes(contest.id)
    }));
    
    return NextResponse.json({
      contestant,
      eligibleContests: contestsWithStatus,
      assignedContests: contestParticipations.map(p => p.contest)
    });
  } catch (error) {
    console.error("Error getting eligible contests:", error);
    return NextResponse.json(
      { error: "Failed to get eligible contests" },
      { status: 500 }
    );
  }
}
