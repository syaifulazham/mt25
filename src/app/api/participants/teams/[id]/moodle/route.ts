import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth-options";
import { prisma } from "@/lib/prisma";
import * as moodleApi from "@/lib/moodle-api";

// Set dynamic to force-dynamic to prevent caching
export const dynamic = 'force-dynamic';

/**
 * POST /api/participants/teams/[id]/moodle
 * Creates a Moodle account for the team and enrolls them in the matching course
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[POST Moodle] Processing request for team ID ${params.id}`);
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log(`[POST Moodle] Unauthorized access attempt`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const teamId = parseInt(params.id);
    if (isNaN(teamId)) {
      return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
    }
    
    // Get team details including contest information
    console.log(`[POST Moodle] Finding team with ID: ${teamId}`);
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        contest: true
      },
    });
    
    console.log(`[POST Moodle] Team found:`, team ? `ID ${team.id}, Email: ${team.team_email}, Contest ID: ${team.contestId}` : 'No team found');
    
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    
    // First check if the team's email already has a Moodle account
    if (!team.team_email) {
      return NextResponse.json({ error: "Team email is required" }, { status: 400 });
    }
    
    console.log(`[POST Moodle] Checking if user with email ${team.team_email} exists`);
    const existingUser = await moodleApi.checkUserExists(team.team_email);
    
    if (existingUser.exists && existingUser.user) {
      console.log(`[POST Moodle] User already exists with ID: ${existingUser.user.id}`);
      // User already exists, so we'll try to enroll them in the course instead
      return await handleExistingUser(team, existingUser.user.id);
    }
    
    // Team email check was moved up
    
    if (!team.contest?.code) {
      return NextResponse.json({ 
        error: "Team's contest code is required to find matching Moodle course" 
      }, { status: 400 });
    }
    
    // Find a matching Moodle course for enrollment  
    console.log(`[POST Moodle] Getting Moodle courses to find match for contest code: ${team.contest?.code}`);
    const matchingCourse = await findMatchingCourse(team.contest?.code || '');
    
    if (!matchingCourse) {
      return NextResponse.json({
        error: "No matching Moodle course found",
        details: `No course found with ID matching contest code ${team.contest?.code}`
      }, { status: 404 });
    }
    
    // Create the Moodle account first using the simplified createUser function
    console.log(`[POST Moodle] Creating user with email: ${team.team_email}`);
    console.log(`[POST Moodle] Team details: ID=${team.id}, Name=${team.name}, Email=${team.team_email}, ContestId=${team.contestId}, ContestCode=${team.contest?.code}`);
    console.log(`[POST Moodle] Matched course details:`, matchingCourse ? 
      `ID=${matchingCourse.id}, Name=${matchingCourse.fullname}, idnumber=${matchingCourse.idnumber}` : 
      'No matching course');
      
    try {
      // Create user and enroll in one operation - simpler approach like the participants/lms implementation
      console.log('[POST Moodle] About to call moodleApi.createUserAndEnrollInCourse with:', {
        email: team.team_email,
        firstname: team.name || "Team",
        lastname: String(team.id),
        courseId: matchingCourse.id
      });
      
      // Use the combined function that handles both creation and enrollment
      const result = await moodleApi.createUserAndEnrollInCourse({
        email: team.team_email,
        firstname: team.name || "Team",
        lastname: String(team.id),
        password: null // Generate random password
      }, 
      matchingCourse.id,
      5 // Default roleId for student
      );
      
      console.log('[POST Moodle] createUserAndEnrollInCourse result:', JSON.stringify(result, null, 2));
      
      if (!result.success || !result.user) {
        console.error(`[POST Moodle] Failed to create user:`, result.error);
        return NextResponse.json({ 
          error: "Failed to create Moodle account", 
          details: result.error || "Unknown error creating user account"
        }, { status: 500 });
      }
      
      console.log(`[POST Moodle] User created successfully with ID: ${result.user.id} and enrolled: ${result.enrolled}`);
      
      // Log the password for debugging if it was returned
      if (result.password) {
        console.log(`[POST Moodle] Generated password: ${result.password}`);
      } else {
        console.log(`[POST Moodle] No password returned from createUserAndEnrollInCourse`);
      }
      
      // Enrollment status is already included in the result
      const success = result.enrolled;
      
      return NextResponse.json({
        success: true,
        user: result.user,
        enrolled: success,
        // Include password in response for debugging purposes
        password: result.password || 'Not available',
        course: {
          id: matchingCourse.id,
          name: matchingCourse.fullname || matchingCourse.shortname || String(matchingCourse.id),
          idnumber: matchingCourse.idnumber
        }
      });
      
    } catch (error) {
      console.error(`[POST Moodle] Exception creating/enrolling user:`, error);
      return NextResponse.json({ 
        error: "Exception in Moodle account creation process", 
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error("[POST /api/participants/teams/[id]/moodle] Error:", error);
    const errorMessage = error.message || 'Unknown error';
    const errorStack = error.stack || 'No stack trace available';
    
    return NextResponse.json({ 
      error: "Failed to create Moodle account", 
      details: errorMessage,
      stack: errorStack.split('\n').slice(0, 3).join('\n') // Include first few lines of stack trace
    }, { status: 500 });
  }
}

/**
 * Handle case when user already exists in Moodle
 */
async function handleExistingUser(team: any, userId: number) {
  try {
    // Find matching course for the team's contest
    const matchingCourse = await findMatchingCourse(team.contest?.code || '');
    
    if (!matchingCourse) {
      return NextResponse.json({
        error: "No matching Moodle course found",
        details: `User exists but no matching course found for contest code ${team.contest?.code}`,
        userExists: true,
        userId: userId
      }, { status: 404 });
    }
    
    // Enroll the existing user in the course
    console.log(`[POST Moodle] Enrolling existing user ${userId} in course ${matchingCourse.id}`);
    const enrollResult = await moodleApi.enrollUserInCourse(
      userId,
      matchingCourse.id,
      5 // Default roleId for student
    );
    
    // Handle different return types from enrollUserInCourse
    let success = false;
    if (typeof enrollResult === 'boolean') {
      success = enrollResult;
    } else if (typeof enrollResult === 'object' && 'success' in enrollResult) {
      success = Boolean(enrollResult.success);
    }
    
    return NextResponse.json({
      success: true,
      userExists: true,
      userId: userId,
      enrolled: success, 
      course: {
        id: matchingCourse.id,
        name: matchingCourse.fullname || matchingCourse.shortname || String(matchingCourse.id),
        idnumber: matchingCourse.idnumber
      }
    });
  } catch (error) {
    console.error(`[POST Moodle] Error enrolling existing user:`, error);
    return NextResponse.json({
      error: "Failed to enroll existing user",
      userExists: true,
      userId: userId,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * Find a matching Moodle course for the given contest code
 */
async function findMatchingCourse(contestCode: string) {
  if (!contestCode) return null;
  
  try {
    const courses = await moodleApi.getCourses();
    console.log(`[POST Moodle] Got ${courses.length} courses from Moodle`);
    
    // Find course with idnumber matching the contest code (with flexible matching)
    const matchingCourse = courses.find(course => 
      course.idnumber === contestCode ||
      (course.idnumber && course.idnumber.endsWith(contestCode)) || 
      (course.idnumber && course.idnumber.includes(contestCode))
    );
    
    console.log(`[POST Moodle] Matching course:`, matchingCourse ? 
      `ID: ${matchingCourse.id}, Name: ${matchingCourse.fullname}, idnumber: ${matchingCourse.idnumber}` : 
      'No matching course found');
    
    return matchingCourse;
  } catch (error) {
    console.error(`[POST Moodle] Error finding matching course:`, error);
    return null;
  }
}
