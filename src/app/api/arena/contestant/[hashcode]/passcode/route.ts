import { NextRequest, NextResponse } from 'next/server';
import { prismaExecute } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { hashcode: string } }
) {
  try {
    const { hashcode } = params;
    const { passcode } = await request.json();

    if (!hashcode) {
      return NextResponse.json(
        { success: false, message: 'Hashcode is required' },
        { status: 400 }
      );
    }

    if (!passcode) {
      return NextResponse.json(
        { success: false, message: 'Passcode is required' },
        { status: 400 }
      );
    }

    // Validate passcode format (6 characters, alphanumeric, uppercase)
    const passcodeRegex = /^[A-Z0-9]{6}$/;
    if (!passcodeRegex.test(passcode)) {
      return NextResponse.json(
        { success: false, message: 'Passcode must be 6 uppercase alphanumeric characters' },
        { status: 400 }
      );
    }

    // Find contestant by hashcode
    const contestants = await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        SELECT id FROM contestant 
        WHERE hashcode = ${hashcode} AND status = 'ACTIVE'
        LIMIT 1
      `
    ) as any[];

    if (contestants.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Contestant not found' },
        { status: 404 }
      );
    }

    const contestantId = contestants[0].id;

    // Update the microsite passcode
    await prismaExecute(async (prisma) => 
      prisma.$queryRaw`
        UPDATE microsite 
        SET passcode = ${passcode}, updatedAt = NOW()
        WHERE contestantId = ${contestantId}
      `
    );

    return NextResponse.json({
      success: true,
      message: 'Passcode updated successfully'
    });

  } catch (error) {
    console.error('Passcode update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
