import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth-options";
import * as moodleApi from "@/lib/moodle-api";

// Mark this route as dynamic to prevent static generation errors
export const dynamic = 'force-dynamic';

/**
 * GET /api/courses/moodle
 * Returns a list of all courses from Moodle LMS
 */
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }
    
    // Get courses from Moodle
    const courses = await moodleApi.getCourses();
    
    return NextResponse.json(courses);
  } catch (error: any) {
    console.error("[GET /api/courses/moodle] Error:", error);
    
    return new NextResponse(
      JSON.stringify({ 
        error: "Failed to fetch Moodle courses", 
        details: error.message 
      }),
      { status: 500 }
    );
  }
}
