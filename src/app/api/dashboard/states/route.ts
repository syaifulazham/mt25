import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrganizerApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to get list of all states for dashboard state selector
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
    
    if (!auth.success) {
      console.error(`API Auth Error: ${auth.message}`);
      
      // Development mode bypass
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Bypassing authentication checks');
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    // Get all states with their name and id
    const states = await prisma.state.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc', // Order alphabetically
      },
    });
    
    return NextResponse.json(states);
  } catch (error) {
    console.error('Error fetching states:', error);
    return NextResponse.json(
      { error: 'Error fetching states', details: (error as Error).message },
      { status: 500 }
    );
  }
}
