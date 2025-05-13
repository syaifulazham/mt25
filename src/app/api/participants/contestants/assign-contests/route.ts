import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { prismaExecute } from "@/lib/prisma-utils";

// POST /api/participants/contestants/assign-contests - Assign eligible contests to a contestant
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse request body
    const data = await request.json();
    const { contestantId } = data;
    
    if (!contestantId) {
      return NextResponse.json({ error: "Missing contestantId" }, { status: 400 });
    }
    
    // Get contestant details to check eligibility
    const contestant = await prismaExecute((prisma: PrismaClient) => prisma.contestant.findUnique({
      where: { id: contestantId }
    }));
    
    if (!contestant) {
      return NextResponse.json({ error: "Contestant not found" }, { status: 404 });
    }
    
    // Get contestant's age
    const contestantAge = contestant.age || 0;
    console.log(`Assigning contests for contestant ${contestantId} with age ${contestantAge}`);
    
    // Get all available contests that are active and accessible
    const allContests = await prismaExecute((prisma: PrismaClient) => prisma.contest.findMany({
      where: {
        endDate: { gte: new Date() },  // Only active contests
        accessibility: true,           // Only accessible contests
      },
      include: {
        targetgroup: true  // Include target groups for filtering
      }
    }));
    
    // Filter eligible contests using basic age criteria
    const eligibleContests = [];
    
    for (const contest of allContests) {
      let isEligible = false;
      
      // Check direct contest eligibility (if contest has direct age restrictions)
      if (contest.minAge !== null && contest.maxAge !== null) {
        // If contest has its own age restrictions
        if (contestantAge >= contest.minAge && contestantAge <= contest.maxAge) {
          isEligible = true;
        }
      } else {
        // No direct contest age restrictions, consider eligible by default
        isEligible = true;
      }
      
      // Now check target group eligibility (only if we have target groups)
      if (isEligible && contest.targetgroup && Array.isArray(contest.targetgroup) && contest.targetgroup.length > 0) {
        // Must be eligible for at least one target group
        isEligible = false; // Reset to false, will set to true if eligible for any target group
        
        for (const group of contest.targetgroup) {
          // Check age eligibility for this target group
          const minAge = group.minAge || 0;
          const maxAge = group.maxAge || 999; // Use a high default if not specified
          
          if (contestantAge >= minAge && contestantAge <= maxAge) {
            // Target group age criteria passed
            isEligible = true;
            break; // Only need to match one target group to be eligible
          }
        }
      }
      
      if (isEligible) {
        eligibleContests.push(contest);
      }
    }
    
    // Count for successful registrations
    let successCount = 0;
    const errors = [];
    
    // Now register contestant for all eligible contests (if any)
    if (eligibleContests.length > 0) {
      // Create participations one by one to avoid transaction issues
      for (const contest of eligibleContests) {
        try {
          // Check if participation already exists
          const existingParticipation = await prismaExecute((prisma: PrismaClient) => prisma.contestParticipation.findUnique({
            where: {
              contestId_contestantId: {
                contestId: contest.id,
                contestantId: contestant.id
              }
            }
          }));
          
          // Skip if already assigned
          if (existingParticipation) {
            continue;
          }
          
          // Create new participation
          await prismaExecute((prisma: PrismaClient) => prisma.contestParticipation.create({
            data: {
              contestId: contest.id,
              contestantId: contestant.id,
              status: "REGISTERED",
              notes: `Auto-assigned based on age criteria (${contestantAge} years)`
            }
          }));
          
          successCount++;
        } catch (error) {
          console.error(`Error registering contestant ${contestant.id} for contest ${contest.id}:`, error);
          errors.push({
            contestId: contest.id,
            error: (error as Error).message
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Contestant assigned to ${successCount} contests`,
      totalEligibleContests: eligibleContests.length,
      assignedContests: successCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error("Error in contestant contest assignment:", error);
    return NextResponse.json(
      { error: "Failed to assign contests to contestant" },
      { status: 500 }
    );
  }
}
