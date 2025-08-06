import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { ic, passcode } = await request.json();

    if (!ic || !passcode) {
      return NextResponse.json(
        { success: false, message: 'IC number and passcode are required' },
        { status: 400 }
      );
    }

    // Find contestant by IC number using raw query to avoid type issues
    const contestants = await prisma.$queryRaw`
      SELECT c.*, cont.name as contingentName, cont.logoUrl as contingentLogo
      FROM contestant c
      LEFT JOIN contingent cont ON c.contingentId = cont.id
      WHERE c.ic = ${ic} AND c.status = 'ACTIVE'
      LIMIT 1
    ` as any[];

    if (contestants.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid IC number or contestant not found' },
        { status: 401 }
      );
    }

    const contestant = contestants[0];

    // Check if contestant has a microsite with matching passcode
    const microsites = await prisma.$queryRaw`
      SELECT * FROM microsite 
      WHERE contestantId = ${contestant.id} AND passcode = ${passcode}
      LIMIT 1
    ` as any[];
    
    if (microsites.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid passcode' },
        { status: 401 }
      );
    }

    const microsite = microsites[0];

    // Update login counter
    await prisma.$executeRaw`
      UPDATE microsite 
      SET loginCounter = loginCounter + 1, updatedAt = NOW()
      WHERE id = ${microsite.id}
    `;

    // Return success with contestant hashcode for redirect
    return NextResponse.json({
      success: true,
      contestantHashcode: contestant.hashcode,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Arena login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
