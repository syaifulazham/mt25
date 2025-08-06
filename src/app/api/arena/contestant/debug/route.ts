import { NextRequest, NextResponse } from 'next/server';
import { prismaExecute } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const hashcode = 'TC25-F85KPN';
    
    console.log('Arena Debug: Testing hashcode:', hashcode);

    // Test basic query first
    const testQuery = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`SELECT 1 as test`
    ) as any[];
    
    console.log('Arena Debug: Basic query works:', testQuery);

    // Test simple contestant lookup
    const simpleContestants = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT c.id, c.name, c.hashcode, c.status
        FROM contestant c
        WHERE c.hashcode = ${hashcode}
        LIMIT 1
      `
    ) as any[];
    
    console.log('Arena Debug: Simple contestant lookup:', simpleContestants);

    // Test if any contestants have hashcodes
    const anyHashcodes = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT c.id, c.name, c.hashcode, c.status
        FROM contestant c
        WHERE c.hashcode IS NOT NULL
        LIMIT 5
      `
    ) as any[];
    
    console.log('Arena Debug: Contestants with hashcodes:', anyHashcodes);

    return NextResponse.json({
      success: true,
      debug: {
        hashcode: hashcode,
        basicQueryWorks: testQuery.length > 0,
        contestantFound: simpleContestants.length > 0,
        contestant: simpleContestants[0] || null,
        contestantsWithHashcodes: anyHashcodes
      }
    });

  } catch (error) {
    console.error('Arena Debug Error:', error);
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
