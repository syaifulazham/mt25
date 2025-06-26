import { NextResponse } from "next/server";
import { prismaExecute } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has appropriate role
    if (!session?.user || !['ADMIN', 'ORGANIZER', 'VIEWER'].includes(session.user.role)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized to view dashboard data' }),
        { status: 401 }
      );
    }

    // 1. Get all states from the database
    const allStates = await prismaExecute(prisma => {
      return prisma.state.findMany();
    });
    
    console.log(`Database has ${allStates.length} states`);

    // Return just the states data
    return NextResponse.json({
      states: allStates,
      totalStates: allStates.length
    });
  } catch (error) {
    console.error('Error in debug-states endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to load debug state data' },
      { status: 500 }
    );
  }
}
