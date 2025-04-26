import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getCurrentUser } from "@/lib/session";

/**
 * GET /api/users/me - Get the current authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current user from the session
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return the user data
    return NextResponse.json(currentUser);
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json(
      { error: "Failed to fetch current user" },
      { status: 500 }
    );
  }
}
