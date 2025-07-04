import { prismaExecute } from "@/lib/prisma";
import { getContestStatistics, ContestStatsResult } from "@/app/organizer/events/stats/_utils/contest-statistics";
import { NextResponse } from "next/server";

/**
 * API handler for fetching contest statistics data
 * This endpoint returns processed contest statistics based on the provided filters
 */
// Add the 'export const dynamic = "force-dynamic"' to explicitly mark this route as dynamic
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // For debugging purposes, we're skipping strict authentication checks
  // In a production environment, you would want to implement proper authentication
  
  try {
    // Parse query parameters using the NextRequest object
    const { searchParams } = new URL(request.url);
    const eventIdParam = searchParams.get("eventId");
    const zoneIdParam = searchParams.get("zoneId");
    const stateIdParam = searchParams.get("stateId");
    
    // Convert params to numbers if they exist
    const eventId = eventIdParam ? parseInt(eventIdParam, 10) : undefined;
    const zoneId = zoneIdParam ? parseInt(zoneIdParam, 10) : undefined;
    const stateId = stateIdParam ? parseInt(stateIdParam, 10) : undefined;
    
    // Log the request parameters
    console.log(`[contest-statistics API] Request with params: eventId=${eventId}, zoneId=${zoneId}, stateId=${stateId}`);
    
    // If no eventId is provided, use the active event
    let finalEventId = eventId;
    if (!finalEventId) {
      const activeEvent = await prismaExecute((prisma) => prisma.event.findFirst({ 
        where: { isActive: true },
        select: { id: true }
      }));
      
      if (activeEvent) {
        finalEventId = activeEvent.id;
      } else {
        return NextResponse.json({ error: "No active event found" }, { status: 404 });
      }
    }
    
    // Get contest statistics using the utility function
    const contestStats = await getContestStatistics(finalEventId, zoneId, stateId);
    console.log(`[contest-statistics API] Successfully generated stats with ${contestStats.groupedContests.length} contest level groups`);
    
    // Return the statistics data
    return NextResponse.json(contestStats);
  } catch (error: any) {
    console.error("[contest-statistics API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch contest statistics" },
      { status: 500 }
    );
  }
}
