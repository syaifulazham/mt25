import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// POST /api/organizer/contests/assign-by-contingent - Bulk assign contests to contestants within a specific contingent
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify that the user is an organizer with appropriate role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized - Organizer access required" }, { status: 403 });
    }
    
    // Get contingent ID from request body
    const body = await request.json();
    const { contingentId } = body;
    
    if (!contingentId) {
      return NextResponse.json({ error: "Contingent ID is required" }, { status: 400 });
    }
    
    // Check if contingent exists
    const contingent = await prisma.contingent.findUnique({
      where: { id: contingentId },
      select: { id: true, name: true }
    });
    
    if (!contingent) {
      return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
    }
    
    // Use raw SQL to get all contestants from this contingent for better performance
    const contestants = await prisma.$queryRaw<Array<{
      id: number;
      name: string;
      age: number | null;
    }>>`
      SELECT id, name, age 
      FROM contestant 
      WHERE contingentId = ${contingentId}
    `;
    
    if (!contestants || contestants.length === 0) {
      return NextResponse.json({ error: "No contestants found in this contingent" }, { status: 404 });
    }
    
    // Try to get contests with their target groups using the standard Prisma query
    console.log("Getting contests with target groups using Prisma ORM");
    const contests = await prisma.contest.findMany({
      include: {
        targetgroup: true
      }
    });
    
    if (contests.length === 0) {
      return NextResponse.json({ error: "No contests found in the system" }, { status: 404 });
    }
    
    // Track created assignments
    const createdAssignments = [];
    const errors = [];
    
    // For each contestant, assign eligible contests
    for (const contestant of contestants) {
      // Filter contests based on age criteria from target groups
      // Filter eligible contests based on contestant age
      const contestantAge = contestant.age || 0; // Default to 0 if null
      
      // Filter contests based on age criteria from target groups
      const eligibleContests = contests.filter(contest => {
        // If contest has no target groups, consider it eligible for all
        if (!contest.targetgroup || contest.targetgroup.length === 0) {
          return true;
        }
        
        // Check if contestant's age matches any of the contest's target groups
        return contest.targetgroup.some(group => {
          // Check if contestant's age is within target group's age range
          const isAboveMinAge = contestantAge >= (group.minAge || 0);
          const isBelowMaxAge = !group.maxAge || group.maxAge === 0 || contestantAge <= group.maxAge;
          
          return isAboveMinAge && isBelowMaxAge;
        });
      });
      
      // Create participation records for eligible contests
      for (const contest of eligibleContests) {
        try {
          try {
            // Use parameterized query to check if participation already exists
            const existingParticipations = await prisma.$queryRaw<Array<{ id: number }>>`
              SELECT id FROM contestParticipation 
              WHERE contestId = ${contest.id} AND contestantId = ${contestant.id}
              LIMIT 1
            `;
            
            // Skip if already assigned
            if (existingParticipations && existingParticipations.length > 0) continue;
            
            // Create new participation record using Prisma create instead of raw SQL to avoid schema issues
            const notes = `Auto-assigned by organizer for contingent ${contingent.name} based on age criteria (${contestant.age || 'unknown'} years)`;
            
            const result = await prisma.contestParticipation.create({
              data: {
                contestId: contest.id,
                contestantId: contestant.id,
                status: "REGISTERED",
                notes: notes
              }
            });
            
            // If insertion was successful
            if (result) {
              // Create a simple participation object to track success
              const participation = {
                contestId: contest.id,
                contestantId: contestant.id,
                status: "REGISTERED"
              };
              
              createdAssignments.push(participation);
            }
          } catch (innerError) {
            // Log specific insertion error and continue with other contests
            console.error(`Error checking/creating participation for contestant ${contestant.id}, contest ${contest.id}:`, innerError);
            continue;
          }
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
    
    // Log operation to console for debugging
    console.log(`Bulk contest assignment completed for contingent ${contingent.id} (${contingent.name}):\n` +
      `Created ${createdAssignments.length} assignments, ${errors.length} errors`);
    
    
    return NextResponse.json({
      success: true,
      contingentId: contingent.id,
      contingentName: contingent.name,
      assignmentsCreated: createdAssignments.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("Error in bulk contest assignment by contingent:", error);
    return NextResponse.json(
      { error: "Failed to assign contests" },
      { status: 500 }
    );
  }
}
