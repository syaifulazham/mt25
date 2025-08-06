import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { prismaExecute } from '@/lib/prisma';

// Generate random 6-character alphanumeric passcode (uppercase)
function generatePasscode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { contestantIds } = await request.json();

    if (!Array.isArray(contestantIds) || contestantIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid contestant IDs provided' },
        { status: 400 }
      );
    }

    // Get user's contingent information from user_participant table
    const userContingents = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT c.id as contingentId
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

    // Verify all contestants belong to the user's contingent and don't already have microsites
    const contestants = await prismaExecute(async (prisma) => {
      const placeholders = contestantIds.map(() => '?').join(',');
      return prisma.$queryRawUnsafe(`
        SELECT 
          c.id,
          c.name,
          c.contingentId,
          m.id as micrositeId
        FROM contestant c
        LEFT JOIN microsite m ON c.id = m.contestantId
        WHERE c.id IN (${placeholders})
      `, ...contestantIds);
    }) as any[];

    // Check if all contestants belong to the user's contingent
    const invalidContestants = contestants.filter((c: any) => c.contingentId !== contingentId);
    if (invalidContestants.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Some contestants do not belong to your contingent' },
        { status: 403 }
      );
    }

    // Check if any contestants already have microsites
    const existingMicrosites = contestants.filter((c: any) => c.micrositeId);
    if (existingMicrosites.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Some contestants already have microsites: ${existingMicrosites.map((c: any) => c.name).join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Create microsites for each contestant
    const createdMicrosites = [];
    
    for (const contestant of contestants) {
      const passcode = generatePasscode();
      
      const result = await prismaExecute(async (prisma) => 
        prisma.$executeRaw`
          INSERT INTO microsite (contestantId, passcode, loginCounter, createdAt, updatedAt) 
          VALUES (${(contestant as any).id}, ${passcode}, 0, NOW(), NOW())
        `
      );

      createdMicrosites.push({
        contestantId: (contestant as any).id,
        contestantName: (contestant as any).name,
        passcode: passcode,
        micrositeId: Date.now() // Will be updated with actual ID from database
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdMicrosites.length} microsites`,
      created: createdMicrosites.length,
      microsites: createdMicrosites
    });

  } catch (error) {
    console.error('Error creating microsites:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
