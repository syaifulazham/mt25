import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import * as moodleApi from "@/lib/moodle-api";
import { NextResponse } from "next/server";
import { z } from "zod";

// Schema for password update request
const passwordUpdateSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters")
});

// POST /api/participants/teams/[id]/moodle/update-password
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401 }
      );
    }

    // Parse the team ID
    const teamId = parseInt(params.id);
    if (isNaN(teamId)) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid team ID" }),
        { status: 400 }
      );
    }

    // Get the request body and validate
    const body = await request.json();
    const validationResult = passwordUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new NextResponse(
        JSON.stringify({ 
          error: "Invalid request data", 
          details: validationResult.error.issues 
        }),
        { status: 400 }
      );
    }

    const { password } = validationResult.data;

    // Fetch the team to get the email
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        team_email: true,
        name: true
      }
    });

    if (!team) {
      return new NextResponse(
        JSON.stringify({ error: "Team not found" }),
        { status: 404 }
      );
    }

    if (!team.team_email) {
      return new NextResponse(
        JSON.stringify({ error: "Team has no email address set" }),
        { status: 400 }
      );
    }

    // Check if user exists in Moodle
    const userCheck = await moodleApi.checkUserExists(team.team_email);
    if (!userCheck.exists || !userCheck.user) {
      return new NextResponse(
        JSON.stringify({ 
          error: "Team does not have a Moodle account", 
          details: `No Moodle account found with email ${team.team_email}` 
        }),
        { status: 404 }
      );
    }

    // Update the password
    const updateResult = await moodleApi.updateUserPassword(
      userCheck.user.id, 
      password
    );

    if (!updateResult.success) {
      return new NextResponse(
        JSON.stringify({ 
          error: "Failed to update password", 
          details: updateResult.error 
        }),
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Password updated for team ${team.name}`
    });

  } catch (error) {
    console.error("Error updating Moodle password:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: "An error occurred while updating the password",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500 }
    );
  }
}
