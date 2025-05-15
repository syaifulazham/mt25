import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import prisma, { prismaExecute } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/participants/contests - Get all contests that participants can join
// This is a participant-specific endpoint that doesn't require authentication checks
// that might be present in the organizer version
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/participants/contests - Request received");

    // Parse query parameters
    const url = new URL(req.url);
    const participationMode = url.searchParams.get("participation_mode") || undefined;
    
    // Build the filter - keep it simple
    const filter: any = {};

    // Add participation mode filter if provided
    if (participationMode) {
      filter.participation_mode = participationMode;
    }

    console.log("Executing Prisma query for participants with filter:", JSON.stringify(filter, null, 2));
    
    try {
      const contests = await prismaExecute(async (prisma: any) => {
        return await prisma.contest.findMany({
          include: {
            targetgroup: true,
            theme: true,
          },
          where: filter
        });
      });

      console.log(`Successfully found ${contests.length} contests for participants`);
      console.log("First contest sample:", JSON.stringify(contests[0], null, 2));
      
      // Return successful response
      return NextResponse.json(contests);
    } catch (prismaError) {
      console.error("Prisma database error:", prismaError);
      
      // Try an even simpler query as fallback
      console.log("Attempting basic fallback query without filters...");
      const basicContests = await prismaExecute(async (prisma: any) => {
        return await prisma.contest.findMany({
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            contestType: true,
            startDate: true,
            endDate: true
          }
        });
      });
      
      console.log(`Fallback query returned ${basicContests.length} basic contests`);
      return NextResponse.json(basicContests);
    }
  } catch (error) {
    console.error("Error fetching contests for participants:", error);
    return NextResponse.json(
      { error: "Failed to fetch contests" },
      { status: 500 }
    );
  }
}
