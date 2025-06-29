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
    
    // Get request parameters
    const body = await request.json();
    const { contingentId, chunkSize = 50, chunkIndex = 0 } = body;
    
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
    
    // Get total contestant count first
    const totalContestants = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM contestant WHERE contingentId = ${contingentId}
    `;
    
    const totalCount = Number(totalContestants[0]?.count || 0);
    
    if (totalCount === 0) {
      return NextResponse.json({ error: "No contestants found in this contingent" }, { status: 404 });
    }
    
    // Calculate chunk boundaries
    const offset = chunkIndex * chunkSize;
    const isLastChunk = offset + chunkSize >= totalCount;
    
    // Get contestants for this chunk using LIMIT and OFFSET
    const contestants = await prisma.$queryRaw<Array<{
      id: number;
      name: string;
      age: number | null;
    }>>`
      SELECT id, name, age 
      FROM contestant 
      WHERE contingentId = ${contingentId}
      ORDER BY id
      LIMIT ${chunkSize} OFFSET ${offset}
    `;
    
    if (!contestants || contestants.length === 0) {
      return NextResponse.json({
        success: true,
        isComplete: true,
        totalContestants: totalCount,
        processedCount: totalCount,
        chunkProcessed: 0,
        assignmentsCreated: 0,
        message: "No more contestants to process"
      });
    }
    
    // Get contests with their target groups
    const contests = await prisma.contest.findMany({
      include: {
        targetgroup: true
      }
    });
    
    if (contests.length === 0) {
      return NextResponse.json({ error: "No contests found in the system" }, { status: 404 });
    }
    
    // Track created assignments and errors for this chunk
    const createdAssignments: Array<{
      contestId: number;
      contestantId: number;
      status: string;
    }> = [];
    const errors: Array<{
      contestantId: number;
      contestId: number;
      error: string;
    }> = [];
    
    // Process contestants in this chunk
    for (const contestant of contestants) {
      const contestantAge = contestant.age || 0;
      
      // Filter eligible contests based on age criteria
      const eligibleContests = contests.filter(contest => {
        if (!contest.targetgroup || contest.targetgroup.length === 0) {
          return true;
        }
        
        return contest.targetgroup.some(group => {
          const isAboveMinAge = contestantAge >= (group.minAge || 0);
          const isBelowMaxAge = !group.maxAge || group.maxAge === 0 || contestantAge <= group.maxAge;
          return isAboveMinAge && isBelowMaxAge;
        });
      });
      
      // Create participation records for eligible contests
      for (const contest of eligibleContests) {
        try {
          // Check if participation already exists
          const existingParticipations = await prisma.$queryRaw<Array<{ id: number }>>`
            SELECT id FROM contestParticipation 
            WHERE contestId = ${contest.id} AND contestantId = ${contestant.id}
            LIMIT 1
          `;
          
          // Skip if already assigned
          if (existingParticipations && existingParticipations.length > 0) continue;
          
          // Create new participation record
          const notes = `Auto-assigned by organizer for contingent ${contingent.name} based on age criteria (${contestant.age || 'unknown'} years)`;
          
          const result = await prisma.contestParticipation.create({
            data: {
              contestId: contest.id,
              contestantId: contestant.id,
              status: "REGISTERED",
              notes: notes
            }
          });
          
          if (result) {
            createdAssignments.push({
              contestId: contest.id,
              contestantId: contestant.id,
              status: "REGISTERED"
            });
          }
        } catch (innerError) {
          console.error(`Error creating participation for contestant ${contestant.id}, contest ${contest.id}:`, innerError);
          continue;
        }
      }
    }
    
    // Calculate progress
    const processedInThisChunk = contestants.length;
    const totalProcessedSoFar = offset + processedInThisChunk;
    
    console.log(`Chunk ${chunkIndex + 1} processed for contingent ${contingent.id} (${contingent.name}):\n` +
      `Processed ${processedInThisChunk} contestants, created ${createdAssignments.length} assignments`);
    
    return NextResponse.json({
      success: true,
      contingentId: contingent.id,
      contingentName: contingent.name,
      chunkIndex,
      chunkSize,
      totalContestants: totalCount,
      processedCount: totalProcessedSoFar,
      chunkProcessed: processedInThisChunk,
      assignmentsCreated: createdAssignments.length,
      isComplete: isLastChunk,
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
