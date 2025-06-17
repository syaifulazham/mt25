import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth-options";
import { prisma } from "@/lib/prisma";
import * as moodleApi from "@/lib/moodle-api";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const teamId = parseInt(params.id, 10);
    if (isNaN(teamId)) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid team ID" }),
        { status: 400 }
      );
    }

    // Fetch the team to get the email
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
        JSON.stringify({ 
          exists: false, 
          error: "Team has no email address set" 
        }),
        { status: 200 }
      );
    }

    // Check if user exists in Moodle
    const userCheck = await moodleApi.checkUserExists(team.team_email);
    
    // Find a matching course if possible
    interface MoodleCourse {
      id: number;
      shortname: string;
      fullname: string;
      idnumber: string;
    }
    
    let matchingCourse: MoodleCourse | null = null;
    let enrolled = false;
    
    if (userCheck.exists && userCheck.user && team.contest?.code) {
      // Get all Moodle courses
      const courses = await moodleApi.getCourses();
      
      // Find a course with idnumber matching or containing the contest code
      matchingCourse = courses.find((course: MoodleCourse) => 
        course.idnumber === team.contest?.code || 
        (course.idnumber && course.idnumber.includes(team.contest?.code))
      ) || null;
      
      // If matching course is found, check if user is enrolled
      if (matchingCourse && userCheck.user) {
        const userCourses = await moodleApi.getUserCourses(userCheck.user.id);
        enrolled = userCourses.some((c: {id: number}) => c.id === matchingCourse?.id);
      }
    }

    // Return the check result
    return NextResponse.json({
      exists: userCheck.exists,
      user: userCheck.user ? {
        id: userCheck.user.id,
        username: userCheck.user.username,
        email: userCheck.user.email
      } : null,
      matchingCourse: matchingCourse ? {
        id: matchingCourse.id,
        name: matchingCourse.fullname || matchingCourse.shortname,
        idnumber: matchingCourse.idnumber
      } : null,
      enrolled: enrolled
    });

  } catch (error) {
    console.error("Error checking Moodle account:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: "An error occurred while checking the Moodle account",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500 }
    );
  }
}
