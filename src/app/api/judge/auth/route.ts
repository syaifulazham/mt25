import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hashcode, passcode } = body;

    if (!hashcode || !passcode) {
      return NextResponse.json(
        { error: 'Hashcode and passcode are required' },
        { status: 400 }
      );
    }

    // Find judge endpoint with matching hashcode and passcode
    const judgeEndpoint = await prisma.judges_endpoints.findFirst({
      where: {
        hashcode: hashcode,
        judge_passcode: passcode
      },
      include: {
        event: {
          select: {
            id: true,
            name: true
          }
        },
        contest: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    if (!judgeEndpoint) {
      return NextResponse.json(
        { error: 'Invalid hashcode or passcode' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      judgeEndpoint
    });
  } catch (error) {
    console.error('Error authenticating judge:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
