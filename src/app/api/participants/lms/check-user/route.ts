import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { checkUserExists } from "@/lib/moodle-api";
import { prismaExecute } from "@/lib/prisma";

// Set dynamic to force-dynamic to prevent caching
export const dynamic = 'force-dynamic';

/**
 * API endpoint to check if a user exists in the Moodle LMS
 * @param request - The incoming request with email parameter
 * @returns NextResponse with user existence status
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get email from query params
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Verify that the request is for the authenticated user's email
    if (email !== session.user?.email) {
      return NextResponse.json(
        { error: "You can only check your own LMS account" },
        { status: 403 }
      );
    }

    console.log(`API: Checking if user with email ${email} exists in Moodle`);

    // Check if user exists in Moodle
    const { exists, user } = await checkUserExists(email);
    
    // Check if this user is already registered on the platform
    if (!exists) {
      try {
        // Check if the user already has an account in the local database
        const participant = await prismaExecute(prisma => prisma.user_participant.findUnique({
          where: { email }
        }));
        
        console.log(`Found participant in database:`, participant);
        
        // If they do, try to create an account for them in Moodle
        if (participant) {
          // Split name into first and last name
          const nameParts = (participant.name || "").split(" ");
          const firstname = nameParts[0] || "";
          const lastname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
          
          // Determine auth method
          const authMethod = participant.password === null ? "oauth2" : "manual";
          
          console.log(`User not found in Moodle but exists in our database. Auth method: ${authMethod}`);
          
          // If user exists in our system but not in Moodle, just return exists: false
          // The client will handle showing the registration option
        }
      } catch (dbError) {
        console.error("Error checking local database:", dbError);
        // Continue even if database check fails
      }
    }

    return NextResponse.json({ 
      exists, 
      username: user?.username, 
      id: user?.id,
      message: exists ? "User found in Moodle" : "User not found in Moodle" 
    });
  } catch (error) {
    console.error("Error checking user in LMS:", error);
    return NextResponse.json(
      { error: "Failed to check user in LMS", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
