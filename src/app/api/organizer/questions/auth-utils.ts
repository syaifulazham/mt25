import { NextResponse } from "next/server";
import { isOrganizerOrAdmin } from "@/lib/session";

/**
 * Helper function to check if a user has authorization to access question routes
 * Requires users to be non-participants and have ADMIN or OPERATOR role
 */
export async function checkQuestionAuthorization(user: any) {
  if (!user) {
    return { 
      authorized: false, 
      response: NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 })
    };
  }
  
  // Check if user is an organizer (not a participant)
  if (user.isParticipant === true) {
    return { 
      authorized: false, 
      response: NextResponse.json({ error: "Unauthorized - Only organizers can access this endpoint" }, { status: 403 })
    };
  }
  
  // Check if user has appropriate role (ADMIN or OPERATOR)
  const hasAccess = await isOrganizerOrAdmin(user.id);
  if (!hasAccess) {
    return { 
      authorized: false, 
      response: NextResponse.json({ error: "Unauthorized - Only admins and operators can access this endpoint" }, { status: 403 })
    };
  }
  
  // User is authorized
  return { authorized: true, response: null };
}
