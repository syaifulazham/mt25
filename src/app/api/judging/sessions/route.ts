import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/judging/sessions
 * Creates a new judging session
 * Body:
 *  - attendanceTeamId: number (required)
 *  - eventContestId: number (required)
 *  - judgeId: number (optional, defaults to current user)
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { attendanceTeamId, eventContestId } = body;
    const judgeId = body.judgeId || session.user.id;
    
    if (!attendanceTeamId || !eventContestId) {
      return NextResponse.json(
        { error: 'attendanceTeamId and eventContestId are required' },
        { status: 400 }
      );
    }
    
    // Check if the eventContest exists and get the associated contest
    const eventContest = await prisma.eventcontest.findUnique({
      where: { id: eventContestId },
      include: {
        contest: true
      }
    });
    
    if (!eventContest) {
      return NextResponse.json(
        { error: 'Event contest not found' },
        { status: 404 }
      );
    }
    
    if (!eventContest.contest || !eventContest.contest.judgingTemplateId) {
      return NextResponse.json(
        { error: 'Event contest has no judging template assigned' },
        { status: 400 }
      );
    }
    
    // Check if the attendance team exists and is present
    const attendanceTeam = await prisma.attendanceTeam.findUnique({
      where: { Id: attendanceTeamId }
    });
    
    if (!attendanceTeam) {
      return NextResponse.json(
        { error: 'Attendance team not found' },
        { status: 404 }
      );
    }
    
    // Check team member presence instead of relying on attendanceTeam.attendanceStatus
    // This allows judging as long as at least one team member is present
    const teamMembers = await prisma.attendanceContestant.findMany({
      where: {
        teamId: attendanceTeam.teamId,
        eventId: attendanceTeam.eventId
      }
    });
    
    // Check if at least one team member is present
    const hasAnyPresentMembers = teamMembers.some(member => member.attendanceStatus === 'Present');
    
    if (!hasAnyPresentMembers) {
      return NextResponse.json(
        { error: 'Cannot judge a team that has no present members' },
        { status: 400 }
      );
    }
    
    // Check if a judging session already exists
    const existingSession = await prisma.judgingSession.findFirst({
      where: {
        judgeId: parseInt(judgeId.toString()),
        attendanceTeamId: attendanceTeamId,
        eventContestId: eventContestId
      }
    });
    
    if (existingSession) {
      return NextResponse.json(
        { 
          message: 'Judging session already exists',
          judgingSession: existingSession
        },
        { status: 200 }
      );
    }
    
    // Create a new judging session
    const judgingSession = await prisma.judgingSession.create({
      data: {
        judgeId: parseInt(judgeId.toString()),
        attendanceTeamId: attendanceTeamId,
        eventContestId: eventContestId,
        status: 'IN_PROGRESS',
        startTime: new Date()
      }
    });
    
    // Get judging template criteria to pre-populate score records
    const judgingTemplate = await prisma.judgingtemplate.findUnique({
      where: { id: eventContest.contest.judgingTemplateId },
      include: { judgingtemplatecriteria: true }
    });
    
    if (!judgingTemplate) {
      return NextResponse.json(
        { error: 'Judging template not found' },
        { status: 404 }
      );
    }
    
    // Create empty score records for each criterion
    const scorePromises = judgingTemplate.judgingtemplatecriteria.map(criterion => 
      prisma.judgingSessionScore.create({
        data: {
          judgingSessionId: judgingSession.id,
          criterionId: criterion.id,
          score: 0,
          criterionName: criterion.name,
          criterionDescription: criterion.description || '',
          criterionWeight: criterion.weight || 0,
          criterionType: criterion.evaluationType || 'NUMERIC',
          maxScore: 10 // Default max score
        }
      })
    );
    
    await Promise.all(scorePromises);
    
    return NextResponse.json({
      judgingSession,
      template: judgingTemplate
    });
    
  } catch (error) {
    console.error('Error creating judging session:', error);
    return NextResponse.json(
      { error: 'Failed to create judging session' },
      { status: 500 }
    );
  }
}
