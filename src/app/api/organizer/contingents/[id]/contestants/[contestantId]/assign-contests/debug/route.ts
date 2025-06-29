import { NextRequest, NextResponse } from "next/server";
import { prismaExecute } from "@/lib/prisma";
import { getCurrentUser, hasRequiredRole } from "@/lib/auth";

// Debug route that just returns authentication status information
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // Return detailed information about the auth state
    return NextResponse.json({
      hasUser: !!user,
      userInfo: user ? {
        id: user.id,
        role: user.role,
        hasRoleProperty: 'role' in user,
        roleType: typeof user.role
      } : null,
      hasRequiredRoleResult: user ? hasRequiredRole(user, ['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER']) : false,
      adminCheckResult: user?.role === 'ADMIN',
      directCompare: user ? {
        isAdmin: user.role === 'ADMIN',
        isOperator: user.role === 'OPERATOR',
        isParticipantsManager: user.role === 'PARTICIPANTS_MANAGER'
      } : null
    });
  } catch (error) {
    console.error("Debug route error:", error);
    return NextResponse.json(
      { 
        error: "Error in debug route", 
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
