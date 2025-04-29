import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// GET /api/organizer/targetgroups
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

    // Fetch all target groups, ordered by id
    const targetGroups = await prisma.targetgroup.findMany({
      orderBy: {
        id: 'asc'
      }
    });

    // Format the response to match the expected format in the frontend
    const formattedTargetGroups = targetGroups.map(group => ({
      value: group.code, // Use the code as the value (used for target_group in question_bank)
      label: group.name, 
      ageGroup: group.ageGroup,
      schoolLevel: group.schoolLevel,
      minAge: group.minAge,
      maxAge: group.maxAge
    }));

    return NextResponse.json(formattedTargetGroups);
  } catch (error) {
    console.error("Error fetching target groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch target groups" },
      { status: 500 }
    );
  }
}
