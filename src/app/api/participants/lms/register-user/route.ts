import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { checkUserExists, createUser } from "@/lib/moodle-api";
import { prismaExecute } from "@/lib/prisma";

// Set dynamic to force-dynamic to prevent caching
export const dynamic = 'force-dynamic';

/**
 * API endpoint to register a user in the Moodle LMS
 * @param request - The incoming request with user details
 * @returns NextResponse with registration result
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data from request body
    const body = await request.json();
    const { email, name, password } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Verify that the request is for the authenticated user's email
    if (email !== session.user?.email) {
      return NextResponse.json(
        { error: "You can only register your own LMS account" },
        { status: 403 }
      );
    }

    // First check if user already exists
    const { exists } = await checkUserExists(email);
    if (exists) {
      return NextResponse.json(
        { error: "User already exists in the LMS" },
        { status: 409 }
      );
    }

    // Get more user details from the database if needed
    const participant = await prismaExecute(prisma => prisma.user_participant.findUnique({
      where: { email }
    }));

    // Split name for firstname and lastname or use data from database
    let firstname = "";
    let lastname = "";
    
    // Use the participant's name from database if available
    if (participant?.name) {
      const nameParts = participant.name.split(' ');
      firstname = nameParts[0] || '';
      lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    } else if (name) {
      const nameParts = name.split(' ');
      firstname = nameParts[0] || '';
      lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    } else {
      // Fallback: use email username as firstname
      firstname = email.split('@')[0];
      lastname = 'User';
    }

    // Create user in Moodle
    // If client provided a password, use it
    // Otherwise, use the password from the database (which will be null for OAuth users)
    // This allows manual entry of passwords during LMS registration
    const result = await createUser({
      email,
      firstname,
      lastname,
      password: password || participant?.password
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create user in LMS" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: result.user?.id,
      username: result.user?.username,
      message: "User successfully registered in LMS"
    });
  } catch (error) {
    console.error("Error registering LMS user:", error);
    return NextResponse.json(
      { error: "Failed to register user in LMS" },
      { status: 500 }
    );
  }
}
