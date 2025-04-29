import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/organizer/target-groups
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an organizer
    const session = await getCurrentUser();
    
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if the user is an organizer (not a participant)
    if ((session as any).isParticipant === true) {
      return NextResponse.json(
        { error: "Access denied. Organizer access required." },
        { status: 403 }
      );
    }

    // Fetch all target groups, ordered by sort_order
    const targetGroups = await prisma.target_group.findMany({
      orderBy: {
        sort_order: 'asc'
      }
    });

    return NextResponse.json(targetGroups);
  } catch (error) {
    console.error("Error fetching target groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch target groups" },
      { status: 500 }
    );
  }
}
