import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/judging/sessions/[id]
 * Retrieves a specific judging session with all scores
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }
    
    // Get the judging session with scores
    const judgingSession = await db.judgingSession.findUnique({
      where: { id },
      include: {
        judgingSessionScores: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    });
    
    if (!judgingSession) {
      return NextResponse.json(
        { error: 'Judging session not found' },
        { status: 404 }
      );
    }
    
    // Check if user is authorized to access this session
    if (judgingSession.judgeId !== parseInt(session.user.id.toString()) && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You are not authorized to access this judging session' },
        { status: 403 }
      );
    }
    
    // Get team and contest details
    const attendanceTeam = await db.attendanceTeam.findUnique({
      where: { Id: judgingSession.attendanceTeamId }
    });
    
    const team = attendanceTeam ? await db.team.findUnique({
      where: { id: attendanceTeam.teamId }
    }) : null;
    
    const contingent = attendanceTeam ? await db.contingent.findUnique({
      where: { id: attendanceTeam.contingentId }
    }) : null;
    
    const eventContest = await db.eventcontest.findUnique({
      where: { id: judgingSession.eventContestId },
      include: {
        contest: true
      }
    });
    
    return NextResponse.json({
      judgingSession,
      team,
      contingent,
      eventContest
    });
    
  } catch (error) {
    console.error('Error retrieving judging session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve judging session' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/judging/sessions/[id]
 * Updates a judging session (completing it, adding comments)
 * Body:
 *  - status: 'IN_PROGRESS' | 'COMPLETED' (optional)
 *  - comments: string (optional)
 *  - totalScore: number (calculated, optional)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    const { status, comments, totalScore } = body;
    
    // Get the current judging session
    const judgingSession = await db.judgingSession.findUnique({
      where: { id },
      include: {
        judgingSessionScores: true
      }
    });
    
    if (!judgingSession) {
      return NextResponse.json(
        { error: 'Judging session not found' },
        { status: 404 }
      );
    }
    
    // Check if user is authorized to update this session
    if (judgingSession.judgeId !== parseInt(session.user.id.toString()) && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You are not authorized to update this judging session' },
        { status: 403 }
      );
    }
    
    // If completing the session, ensure all criteria have scores
    if (status === 'COMPLETED') {
      const hasEmptyScores = judgingSession.judgingSessionScores.some(score => score.score === 0);
      if (hasEmptyScores) {
        return NextResponse.json(
          { error: 'All criteria must have scores before completing the judging session' },
          { status: 400 }
        );
      }
    }
    
    // Calculate totalScore if not provided
    let calculatedTotalScore = totalScore;
    if (status === 'COMPLETED' && !calculatedTotalScore) {
      // Calculate weighted score
      calculatedTotalScore = judgingSession.judgingSessionScores.reduce((acc, score) => {
        // Convert criterion weight (0-100) to decimal (0-1) and multiply by score
        const weightedScore = (score.criterionWeight / 100) * score.score;
        return acc + weightedScore;
      }, 0);
    }
    
    // Update the judging session
    const updatedSession = await db.judgingSession.update({
      where: { id },
      data: {
        status: status || judgingSession.status,
        comments: comments !== undefined ? comments : judgingSession.comments,
        totalScore: calculatedTotalScore !== undefined ? calculatedTotalScore : judgingSession.totalScore,
        endTime: status === 'COMPLETED' ? new Date() : judgingSession.endTime
      },
      include: {
        judgingSessionScores: true
      }
    });
    
    return NextResponse.json({
      judgingSession: updatedSession
    });
    
  } catch (error) {
    console.error('Error updating judging session:', error);
    return NextResponse.json(
      { error: 'Failed to update judging session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/judging/sessions/[id]
 * Deletes a judging session (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can delete judging sessions.' },
        { status: 401 }
      );
    }
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }
    
    // Delete the judging session (cascades to scores)
    await db.judgingSession.delete({
      where: { id }
    });
    
    return NextResponse.json({
      message: 'Judging session deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting judging session:', error);
    return NextResponse.json(
      { error: 'Failed to delete judging session' },
      { status: 500 }
    );
  }
}
