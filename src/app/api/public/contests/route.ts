import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const themeId = searchParams.get("themeId");

    if (!themeId) {
      // If no themeId provided, return all contests
      const contests = await prisma.contest.findMany({
        include: {
          theme: true
        }
      });
      return NextResponse.json(contests);
    }

    // For debugging purposes, first let's check if any contests exist at all
    const allContests = await prisma.contest.findMany({
      include: {
        theme: true,
        targetgroup: true
      }
    });
    
    console.log(`Found ${allContests.length} total contests in database`);
    
    // Then check if any contests exist with the specified theme
    const themeIdNumber = parseInt(themeId, 10);
    
    // Find contests by theme ID
    const contests = await prisma.contest.findMany({
      where: {
        themeId: themeIdNumber
      },
      include: {
        theme: true,
        targetgroup: true 
      }
    });
    
    console.log(`Found ${contests.length} contests with themeId: ${themeIdNumber}`);
    
    if (contests.length === 0 && allContests.length > 0) {
      // If we found no contests with this theme but contests exist,
      // let's dump theme IDs for debugging
      const themeIds = allContests
        .filter(c => c.themeId !== null)
        .map(c => c.themeId);
        
      console.log(`Available theme IDs in contests: ${JSON.stringify([...new Set(themeIds)])}`);
    }

    return NextResponse.json(contests);
  } catch (error) {
    console.error("Error fetching contests:", error);
    return NextResponse.json(
      { error: "Failed to fetch contests" },
      { status: 500 }
    );
  }
}
