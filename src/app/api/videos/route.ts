import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/videos - Get all active videos
export async function GET(req: NextRequest) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      
      // Check authentication
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const groupName = searchParams.get('group_name');
    
    // Build the where clause
    const where: any = {
      isActive: true
    };
    
    // Add group filter if provided
    if (groupName) {
      where.group_name = groupName;
    }

    // Fetch videos from the database
    // Note: Need to run prisma generate after schema changes for this to work
    // Using any type assertion as a temporary workaround
    const videos = await (prisma as any).video.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
