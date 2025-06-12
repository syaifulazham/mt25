import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

// Moodle API functions
import * as MoodleAPI from "@/lib/moodle-api";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Reset a user's password in Moodle LMS
 * This endpoint allows changing password without knowing the old password
 */
export async function POST(request: NextRequest) {
  try {
    // Get the current user from session
    const user = await getCurrentUser();
    
    // Check if user is authenticated
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
    }
    
    // Parse request body for email and new password
    const data = await request.json();
    
    if (!data.email || !data.password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    
    // Get the user's email from the currently logged in user
    // to ensure they can only reset their own password
    const userEmail = user.email;
    
    // Verify the requested email matches the logged-in user's email
    if (data.email !== userEmail) {
      return NextResponse.json(
        { error: "You can only reset your own password" },
        { status: 403 }
      );
    }
    
    // Check if the user exists in Moodle
    const userCheckResult = await MoodleAPI.checkUserExists(userEmail);
    
    if (!userCheckResult.exists || !userCheckResult.user) {
      return NextResponse.json(
        { error: "Account not found in LMS" },
        { status: 404 }
      );
    }
    
    // Get the Moodle user ID
    const moodleUserId = userCheckResult.user.id;
    
    // Direct call to Moodle API to update user password
    const MOODLE_URL = process.env.MOODLE_URL || 'https://bengkel.techlympics.my';
    const MOODLE_TOKEN = process.env.MOODLE_TOKEN;
    
    if (!MOODLE_URL || !MOODLE_TOKEN) {
      return NextResponse.json(
        { error: "Moodle configuration is missing" },
        { status: 500 }
      );
    }
    
    const url = `${MOODLE_URL}/webservice/rest/server.php`;
    
    // Create form data for Moodle API call
    const formData = new URLSearchParams();
    formData.append('wstoken', MOODLE_TOKEN);
    formData.append('wsfunction', 'core_user_update_users');
    formData.append('moodlewsrestformat', 'json');
    formData.append('users[0][id]', moodleUserId.toString());
    formData.append('users[0][password]', data.password);
    
    // Make the API call to Moodle
    let response;
    try {
      // Convert URLSearchParams to string properly
      const formDataString = formData.toString();
      console.log("Making Moodle API call to:", url);
      console.log("With payload:", formDataString);
      
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formDataString,
      });
      
      console.log("Moodle API response status:", response.status);
    } catch (fetchError) {
      console.error("Moodle API fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to connect to Moodle API" },
        { status: 500 }
      );
    }
    
    if (!response.ok) {
      let errorData;
      let responseText;
      try {
        // First try to get the raw text
        responseText = await response.text();
        console.error("Raw error response:", responseText);
        
        // Then try to parse it as JSON if possible
        try {
          errorData = JSON.parse(responseText);
        } catch (jsonError) {
          errorData = { error: response.statusText, rawResponse: responseText };
        }
      } catch (e) {
        errorData = { error: response.statusText };
      }
      
      console.error("Failed to reset password:", {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      return NextResponse.json(
        { error: "Failed to reset password", details: errorData },
        { status: 500 }
      );
    }
    
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error("Failed to parse Moodle API response:", parseError);
      return NextResponse.json(
        { error: "Invalid response from Moodle API" },
        { status: 500 }
      );
    }
    
    // Check if there was an exception from Moodle
    if (result && result.exception) {
      console.error("Moodle API error:", result.exception);
      return NextResponse.json(
        { error: "Failed to reset password: " + result.exception.message },
        { status: 500 }
      );
    }
    
    // Return success response with user info
    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully",
      username: userCheckResult.user.username,
    });
    
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
