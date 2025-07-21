import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/judge/sessions/[id]
 * Updates a judge session (comments, status)
 * Body:
 *  - hashcode: string (required)
 *  - comments: string (optional)
 *  - status: string (optional)
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`Received PATCH request for session ID: ${params.id}`);
    
    const sessionId = parseInt(params.id);
    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { hashcode, comments, status } = body;

    if (!hashcode) {
      return NextResponse.json(
        { error: 'hashcode is required' },
        { status: 400 }
      );
    }
    
    console.log(`Validating judge with hashcode: ${hashcode} for session ${sessionId}`);
    
    // First, find the judge endpoint with the given hashcode
    const judgeEndpoint = await prisma.judges_endpoints.findFirst({
      where: { hashcode },
      include: {
        event: true,
        contest: true
      }
    });

    if (!judgeEndpoint) {
      console.error(`Judge endpoint not found for hashcode: ${hashcode}`);
      return NextResponse.json(
        { error: 'Invalid judge hashcode' },
        { status: 401 }
      );
    }
    
    console.log(`Found judge endpoint: ${judgeEndpoint.id} (${judgeEndpoint.judge_name})`);
    
    // Now validate that the session exists and belongs to this judge's event/contest
    const session = await prisma.judgingSession.findFirst({
      where: {
        id: sessionId,
        eventcontest: {
          eventId: judgeEndpoint.eventId,
          contestId: judgeEndpoint.contestId
        }
      }
    });
    
    if (!session) {
      console.error(`Session ${sessionId} not found or not accessible by this judge`);
      return NextResponse.json(
        { error: 'Invalid session ID or unauthorized access' },
        { status: 401 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    // Add comments if provided
    if (comments !== undefined) {
      updateData.comments = comments;
    }

    // Add status if provided
    if (status !== undefined) {
      // Validate status value
      const validStatuses = ['IN_PROGRESS', 'COMPLETED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    // If no update fields provided, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      );
    }

    // Update the session
    const updatedSession = await prisma.judgingSession.update({
      where: { id: sessionId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      session: updatedSession
    });

  } catch (error) {
    console.error('Error updating judge session:', error);
    return NextResponse.json(
      { error: 'Failed to update judge session' },
      { status: 500 }
    );
  }
}
