import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import * as moodleApi from "@/lib/moodle-api";
import { NextResponse } from "next/server";

// POST /api/participants/teams/[id]/moodle/join
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

    // Fetch the team with its contest details
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        contest: {
          select: {
            code: true,
            name: true
          }
        }
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

    if (!team.contest?.code) {
      return new NextResponse(
        JSON.stringify({ error: "Team's contest has no code" }),
        { status: 400 }
      );
    }

    // Get all Moodle courses
    const courses = await moodleApi.getCourses();
    
    // Find a course with idnumber matching the contest code
    const matchingCourse = courses.find(course => course.idnumber === team.contest?.code);
    
    if (!matchingCourse) {
      return new NextResponse(
        JSON.stringify({ 
          error: "No matching Moodle course found", 
          details: `No Moodle course with ID number '${team.contest?.code}' found` 
        }),
        { status: 404 }
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

    // Join the user to the course
    console.log(`[Moodle Join] Attempting to join user with email ${team.team_email} to course ID ${matchingCourse.id}`);
    
    let joinResult;
    try {
      joinResult = await moodleApi.joinCourse(
        team.team_email,
        matchingCourse.id
      );
      console.log(`[Moodle Join] Result:`, JSON.stringify(joinResult));
    } catch (joinError) {
      console.error(`[Moodle Join] Exception in joinCourse:`, joinError);
      return new NextResponse(
        JSON.stringify({ 
          error: "Exception occurred during joinCourse", 
          details: joinError instanceof Error ? joinError.message : String(joinError) 
        }),
        { status: 500 }
      );
    }

    if (!joinResult.success) {
      return new NextResponse(
        JSON.stringify({ 
          error: "Failed to join course", 
          details: joinResult.error 
        }),
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Team ${team.name} joined Moodle course: ${matchingCourse.fullname}`,
      course: {
        id: matchingCourse.id,
        name: matchingCourse.fullname,
        shortname: matchingCourse.shortname,
        idnumber: matchingCourse.idnumber
      }
    });

  } catch (error) {
    console.error("Error joining Moodle course:", error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error(`[Moodle Join] Error name: ${error.name}`);
      console.error(`[Moodle Join] Error message: ${error.message}`);
      console.error(`[Moodle Join] Error stack: ${error.stack}`);
    } else {
      console.error(`[Moodle Join] Non-Error object thrown:`, error);
    }
    
    return new NextResponse(
      JSON.stringify({ 
        error: "An error occurred while joining the course",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500 }
    );
  }
}
