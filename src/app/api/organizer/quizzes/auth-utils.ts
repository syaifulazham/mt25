import { NextResponse } from "next/server";
import { isOrganizerOrAdmin } from "@/lib/session";

/**
 * Helper function to check if a user has authorization to access quiz routes
 * Requires users to be non-participants and have ADMIN or OPERATOR role
 */
export async function checkQuizAuthorization(user: any) {
  console.log('Quiz Authorization Check - User:', JSON.stringify(user, null, 2));
  
  if (!user) {
    console.log('Quiz Auth - No user found');
    return { 
      authorized: false, 
      response: NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 })
    };
  }
  
  // Check if user is an organizer (not a participant)
  if (user.isParticipant === true) {
    console.log('Quiz Auth - User is participant, not organizer');
    return { 
      authorized: false, 
      response: NextResponse.json({ error: "Unauthorized - Only organizers can access this endpoint" }, { status: 403 })
    };
  }
  
  console.log('Quiz Auth - User role from database:', user.role);
  
  // Directly check if role is ADMIN or OPERATOR before calling DB function
  if (user.role === 'ADMIN' || user.role === 'OPERATOR') {
    console.log('Quiz Auth - Direct role check passed for role:', user.role);
    return { authorized: true, response: null };
  }
  
  // Secondary check using database query
  console.log('Quiz Auth - Using DB check with user ID:', user.id);
  const hasAccess = await isOrganizerOrAdmin(user.id);
  console.log('Quiz Auth - DB check result:', hasAccess);
  
  if (!hasAccess) {
    console.log('Quiz Auth - Access denied by DB check');
    return { 
      authorized: false, 
      response: NextResponse.json({ error: "Unauthorized - Only admins and operators can access this endpoint" }, { status: 403 })
    };
  }
  
  // User is authorized
  console.log('Quiz Auth - User authorized');
  return { authorized: true, response: null };
}
