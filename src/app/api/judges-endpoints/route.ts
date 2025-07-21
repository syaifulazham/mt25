import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

// Generate random 6-character uppercase alphanumeric passcode
function generatePasscode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate hashcode from eventId + contestId + judge_email + current datetime
function generateHashcode(eventId: number, contestId: number, email: string): string {
  const timestamp = new Date().toISOString();
  const data = `${eventId}${contestId}${email}${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const contestId = searchParams.get('contestId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const eventIdNum = parseInt(eventId);
    if (isNaN(eventIdNum)) {
      return NextResponse.json({ error: 'Invalid event ID format' }, { status: 400 });
    }

    // Build Prisma where clause
    const whereClause: any = {
      eventId: eventIdNum
    };
    
    if (contestId) {
      const contestIdNum = parseInt(contestId);
      if (!isNaN(contestIdNum)) {
        whereClause.contestId = contestIdNum;
      }
    }
    
    // Fetch judges endpoints using Prisma
    const judgesEndpoints = await prisma.judges_endpoints.findMany({
      where: whereClause,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ 
      judgesEndpoints,
    });
  } catch (error) {
    console.error('Error fetching judges endpoints:', error);
    return NextResponse.json(
      { error: 'Failed to fetch judges endpoints' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { eventId, contestId, judge_name, judge_ic, judge_email, judge_phoneNo } = body;

    // Validate required fields
    if (!eventId || !contestId) {
      return NextResponse.json(
        { error: 'Event ID and Contest ID are required' },
        { status: 400 }
      );
    }

    // Validate eventId and contestId are numbers
    const eventIdNum = parseInt(eventId);
    const contestIdNum = parseInt(contestId);
    if (isNaN(eventIdNum) || isNaN(contestIdNum)) {
      return NextResponse.json(
        { error: 'Invalid Event ID or Contest ID format' },
        { status: 400 }
      );
    }

    // Verify event and contest exist
    const event = await prisma.event.findUnique({
      where: { id: eventIdNum }
    });

    const contest = await prisma.contest.findUnique({
      where: { id: contestIdNum }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Generate passcode and hashcode
    const passcode = generatePasscode();
    const email = judge_email || `judge_${Date.now()}@temp.com`; // Fallback email for hashcode generation
    const hashcode = generateHashcode(eventIdNum, contestIdNum, email);

    // Create judges endpoint using Prisma
    const judgeEndpoint = await prisma.judges_endpoints.create({
      data: {
        eventId: eventIdNum,
        contestId: contestIdNum,
        judge_name: judge_name || '',
        judge_ic: judge_ic || '',
        judge_email: judge_email || '',
        judge_phoneNo: judge_phoneNo || '',
        judge_passcode: passcode,
        hashcode: hashcode
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

    return NextResponse.json(judgeEndpoint);
  } catch (error) {
    console.error('Error creating judge endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to create judge endpoint' },
      { status: 500 }
    );
  }
}
