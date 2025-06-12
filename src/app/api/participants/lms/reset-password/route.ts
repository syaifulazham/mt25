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
      console.log("With payload:", formDataString.replace(MOODLE_TOKEN, '[REDACTED]')); // Redact token for security
      console.log("Moodle API environment check:", { 
        moodleUrlConfigured: !!process.env.MOODLE_URL, 
        moodleTokenConfigured: !!process.env.MOODLE_TOKEN,
        nodeEnv: process.env.NODE_ENV
      });
      
      // Add timeout to prevent long-hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formDataString,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log("Moodle API response status:", response.status);
      console.log("Moodle API response headers:", Object.fromEntries(response.headers.entries()));
    } catch (error) {
      const fetchError = error as Error;
      console.error("Moodle API fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to connect to Moodle API", details: fetchError.message || "Unknown fetch error" },
        { status: 500 }
      );
    }
    
    // Always capture the raw response first for debugging in production
    let responseText;
    try {
      responseText = await response.clone().text();
      console.log("Full Moodle API response:", responseText.substring(0, 1000) + (responseText.length > 1000 ? '...' : ''));
    } catch (textError) {
      console.error("Could not get response text:", textError);
    }
    
    if (!response.ok) {
      let errorData;
      try {
        // Then try to parse it as JSON if possible
        try {
          errorData = responseText ? JSON.parse(responseText) : { error: response.statusText };
        } catch (jsonError) {
          errorData = { error: response.statusText, rawResponse: responseText };
          console.error("Response parsing error:", jsonError);
        }
      } catch (e) {
        errorData = { error: response.statusText };
        console.error("Error handling response:", e);
      }
      
      console.error("Failed to reset password:", {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('Content-Type'),
        errorData
      });
      
      return NextResponse.json(
        { error: "Failed to reset password", details: errorData },
        { status: 500 }
      );
    }
    
    // If the response was successful, analyze the response format
    let result;
    try {
      // For core_user_update_users, an empty array response is success
      if (responseText === 'null' || responseText === '[]' || responseText === '') {
        console.log("Moodle API returned empty response, which indicates success");
        result = { success: true };
      } else {
        result = await response.json();
      }
    } catch (parseError) {
      console.error("Failed to parse Moodle API response:", parseError);
      // If the response is empty but status is OK, treat as success
      if (response.ok && (!responseText || responseText === 'null' || responseText === '[]')) {
        console.log("Treating empty response as success");
        result = { success: true };
      } else {
        return NextResponse.json(
          { 
            error: "Invalid response from Moodle API", 
            details: (parseError as Error).message,
            responseText: responseText?.substring(0, 200) + (responseText && responseText.length > 200 ? '...' : '')
          },
          { status: 500 }
        );
      }
    }
    
    // Check if there was an exception from Moodle
    if (result && (result.exception || (typeof result === 'object' && 'error' in result))) {
      console.error("Moodle API error:", result);
      return NextResponse.json(
        { 
          error: "Failed to reset password", 
          details: result.exception ? result.exception.message : result.error || 'Unknown Moodle error'
        },
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
