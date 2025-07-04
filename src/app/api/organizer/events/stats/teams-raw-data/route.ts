import { prismaExecute } from "@/lib/prisma";
import { buildFilterClause, fetchRawTeamData } from "@/app/organizer/events/stats/_utils/contest-statistics";
import { NextResponse } from "next/server";

/**
 * API handler for fetching raw team data for debugging purposes
 * This endpoint returns the raw data used to generate contest statistics
 */
export async function GET(request: Request) {
  // For debugging purposes, we're skipping strict authentication checks
  // In a production environment, you would want to implement proper authentication
  // This endpoint is only for debugging purposes
  
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const eventIdParam = url.searchParams.get("eventId");
    const zoneIdParam = url.searchParams.get("zoneId");
    const stateIdParam = url.searchParams.get("stateId");
    
    // Convert params to numbers if they exist
    const eventId = eventIdParam ? parseInt(eventIdParam, 10) : undefined;
    const zoneId = zoneIdParam ? parseInt(zoneIdParam, 10) : undefined;
    const stateId = stateIdParam ? parseInt(stateIdParam, 10) : undefined;
    
    // Log the request parameters
    console.log(`[teams-raw-data API] Request with params: eventId=${eventId}, zoneId=${zoneId}, stateId=${stateId}`);
    
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
    
    // Build filter clause and fetch raw team data
    const filters = buildFilterClause(finalEventId, zoneId, stateId);
    const teamData = await fetchRawTeamData(filters);
    
    console.log(`[teams-raw-data API] Found ${teamData.length} team data records`);
    
    // Return the raw team data
    return NextResponse.json(teamData);
  } catch (error: any) {
    console.error("[teams-raw-data API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch team data" },
      { status: 500 }
    );
  }
}
