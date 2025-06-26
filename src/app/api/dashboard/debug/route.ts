import { NextResponse } from 'next/server';
import { prismaExecute } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

export async function GET() {
  // Authenticate the request
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check if user has appropriate role to access data
  const userRole = session.user.role;
  if (!userRole || (userRole !== 'ADMIN' && userRole !== 'VIEWER')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }
  
  try {
    // Get counts from key tables to check if data exists
    const counts = await prismaExecute(async prisma => {
      return {
        contestants: await prisma.contestant.count(),
        teams: await prisma.team.count(),
        schools: await prisma.school.count(),
        contingents: await prisma.contingent.count(),
        states: await prisma.state.count(),
        users: await prisma.user.count(),
        currentUser: {
          email: session.user.email,
          role: session.user.role,
          name: session.user.name
        }
      };
    });
    
    return NextResponse.json({
      message: 'Debug information',
      counts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error accessing database for debug info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
