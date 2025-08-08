import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { prismaExecute } from '@/lib/prisma';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Debug API: Starting...');
    
    // Test session
    const user = await getSessionUser({ redirectToLogin: false });
    console.log('Debug API: User session:', user ? 'Found' : 'Not found', user?.id);
    
    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', debug: 'No user session' },
        { status: 401 }
      );
    }

    // Test basic prisma query
    console.log('Debug API: Testing basic query...');
    const testQuery = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`SELECT 1 as test`
    ) as any[];
    
    console.log('Debug API: Basic query result:', testQuery);

    // Test contingent query
    console.log('Debug API: Testing contingent query for user:', user.id);
    const userContingents = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT c.id as contingentId, c.name as contingentName
        FROM contingent c
        WHERE c.participantId = ${user.id}
        LIMIT 1
      `
    ) as any[];
    
    console.log('Debug API: Contingent query result:', userContingents);

    if (!userContingents || userContingents.length === 0) {
      return NextResponse.json({
        success: false, 
        message: 'User contingent not found',
        debug: {
          userId: user.id,
          contingentsFound: userContingents?.length || 0
        }
      }, { status: 404 });
    }

    const contingentId = userContingents[0].contingentId;
    console.log('Debug API: Found contingent ID:', contingentId);

    // Test simple contestant query
    console.log('Debug API: Testing contestant query...');
    const contestants = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT c.id, c.name, c.contingentId
        FROM contestant c
        WHERE c.contingentId = ${contingentId}
        LIMIT 5
      `
    ) as any[];
    
    console.log('Debug API: Contestant query result:', contestants);

    return NextResponse.json({
      success: true,
      debug: {
        userId: user.id,
        contingentId: contingentId,
        contingentName: userContingents[0].contingentName,
        contestantsCount: contestants.length,
        contestants: contestants
      }
    });

  } catch (error) {
    console.error('Debug API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
