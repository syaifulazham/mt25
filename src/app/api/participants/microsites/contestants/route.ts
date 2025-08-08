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

    // Get user's contingent information from user_participant table
    const userContingents = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT c.id as contingentId, c.name as contingentName
        FROM contingent c
        WHERE c.participantId = ${user.id}
        LIMIT 1
      `
    ) as any[];

    if (!userContingents || userContingents.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User contingent not found' },
        { status: 404 }
      );
    }

    const contingentId = userContingents[0].contingentId;
    const contingentName = userContingents[0].contingentName;

    // Fetch all contestants for this contingent with microsite information
    const contestantRows = await prismaExecute(async (prisma) => 
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
      contingentName: contingentName,
      institutionName: contingentName, // Using contingent name as institution name for now
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
