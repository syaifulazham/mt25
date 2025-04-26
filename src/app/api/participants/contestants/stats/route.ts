import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

// GET handler - Get contestant statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user ID from query params
    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("userId");
    
    if (!userIdParam) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    const userId = parseInt(userIdParam);
    
    // Get all contestants for this user or their contingent
    const userContingents = await prisma.contingent.findMany({
      where: {
        participantId: userId
      },
      select: {
        id: true
      }
    });
    
    const contingentIds = userContingents.map(c => c.id);
    
    // Get all contestants for this user's contingents
    const contestants = await prisma.contestant.findMany({
      where: {
        contingentId: {
          in: contingentIds.length > 0 ? contingentIds : [-1]
        }
      },
      select: {
        id: true,
        edu_level: true
      }
    });
    
    // Calculate statistics
    const total = contestants.length;
    
    // Group by education level
    const byEduLevel: { [key: string]: number } = {};
    
    contestants.forEach(contestant => {
      const level = contestant.edu_level;
      byEduLevel[level] = (byEduLevel[level] || 0) + 1;
    });
    
    return NextResponse.json({
      total,
      byEduLevel
    });
  } catch (error) {
    console.error("Error fetching contestant statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch contestant statistics" },
      { status: 500 }
    );
  }
}
