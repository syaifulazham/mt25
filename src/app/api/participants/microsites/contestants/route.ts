import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { prismaExecute } from '@/lib/prisma';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's contingent information - either as direct participant or as contingent manager
    const userContingents = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT DISTINCT c.id as contingentId, c.name as contingentName
        FROM contingent c
        LEFT JOIN contingentManager cm ON c.id = cm.contingentId
        WHERE c.participantId = ${user.id} OR cm.participantId = ${user.id}
      `
    ) as any[];

    if (!userContingents || userContingents.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User contingent not found' },
        { status: 404 }
      );
    }

    // Prepare array to hold all contingent IDs
    const contingentIds = userContingents.map((c: any) => c.contingentId);
    
    // Create a map of contingent names for reference
    const contingentNameMap = Object.fromEntries(
      userContingents.map((c: any) => [c.contingentId, c.contingentName])
    );

    // Fetch all contestants for all contingents the user has access to
    let contestantRows: any[] = [];
    
    // Handle each contingent separately to avoid SQL injection issues with IN clause
    for (const contingentId of contingentIds) {
      const results = await prismaExecute(async (prisma) => 
        prisma.$queryRaw`
          SELECT 
            c.id,
            c.name,
            c.ic,
            c.email,
            c.gender,
            c.age,
            c.edu_level,
            c.class_grade,
            c.class_name,
            c.contingentId,
            m.id as micrositeId,
            m.passcode,
            m.loginCounter,
            CASE WHEN m.id IS NOT NULL THEN 1 ELSE 0 END as hasMicrosite
          FROM contestant c
          LEFT JOIN microsite m ON c.id = m.contestantId
          WHERE c.contingentId = ${contingentId}
          ORDER BY c.name
        `
      ) as any[];
      
      contestantRows = [...contestantRows, ...results];
    }

    const contestants = contestantRows.map((row: any) => ({
      id: row.id,
      name: row.name || '',
      ic: row.ic || '',
      email: row.email || '',
      gender: row.gender || '',
      age: row.age || 0,
      edu_level: row.edu_level || '',
      class_grade: row.class_grade || '',
      class_name: row.class_name || '',
      contingentName: contingentNameMap[row.contingentId] || '',
      institutionName: contingentNameMap[row.contingentId] || '', // Using contingent name as institution name
      hasMicrosite: Boolean(row.hasMicrosite),
      micrositeId: row.micrositeId,
      passcode: row.passcode,
      loginCounter: row.loginCounter || 0
    }));

    return NextResponse.json({
      success: true,
      contestants
    });

  } catch (error) {
    console.error('Error fetching contestants:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
