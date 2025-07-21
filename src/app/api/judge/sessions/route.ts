import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hashcode, attendanceTeamId, eventContestId } = body;
    
    console.log(`Starting judge session creation with hashcode: ${hashcode}, attendanceTeamId: ${attendanceTeamId}, eventContestId: ${eventContestId}`);

    if (!hashcode || !attendanceTeamId || !eventContestId) {
      return NextResponse.json(
        { error: 'Hashcode, attendanceTeamId, and eventContestId are required' },
        { status: 400 }
      );
    }

    // Step 1: Verify judge endpoint exists
    const judgeEndpoint = await prisma.judges_endpoints.findFirst({
      where: { hashcode: hashcode }
    });
    
    if (!judgeEndpoint) {
      console.error(`Judge endpoint not found for hashcode: ${hashcode}`);
      return NextResponse.json(
        { error: 'Invalid judge endpoint' },
        { status: 401 }
      );
    }
    console.log(`Found judge endpoint: ${judgeEndpoint.id} (${judgeEndpoint.judge_name})`);
    
    // Step 2: Check if judging session already exists
    console.log(`Checking if judging session already exists for team: ${attendanceTeamId}, event contest: ${eventContestId}`);
    const existingSession = await prisma.judgingSession.findFirst({
      where: {
        attendanceTeamId: attendanceTeamId,
        eventContestId: eventContestId
      }
    });
    
    if (existingSession) {
      return NextResponse.json({
        judgingSession: existingSession,
        message: 'Judging session already exists'
      });
    }
    
    // Step 3: Get event contest details
    console.log(`Getting event contest details for ID: ${eventContestId}`);
    const eventContest = await prisma.eventcontest.findUnique({
      where: { id: eventContestId },
      include: { contest: true }
    });
    
    if (!eventContest) {
      console.error(`Event contest with ID ${eventContestId} not found`);
      return NextResponse.json(
        { error: 'Event contest not found' },
        { status: 404 }
      );
    }
    console.log(`Event contest found with contestId: ${eventContest.contestId}`);
    
    if (!eventContest.contest || !eventContest.contest.judgingTemplateId) {
      return NextResponse.json(
        { error: 'Event contest has no judging template assigned' },
        { status: 400 }
      );
    }
    
    // Step 4: Get judging template for this contest
    console.log(`Getting judging template for contestId: ${eventContest.contestId}`);
    const judgingTemplate = await prisma.judgingtemplate.findUnique({
      where: { id: eventContest.contest.judgingTemplateId },
      include: { judgingtemplatecriteria: true }
    });
    
    if (!judgingTemplate) {
      console.error(`No judging template found for contest ID ${eventContest.contestId}`);
      return NextResponse.json(
        { error: 'No judging template assigned to this contest' },
        { status: 400 }
      );
    }
    console.log(`Found judging template: ${judgingTemplate.id} with name: ${judgingTemplate.name}`);
    
    // Step 5: Create judging session
    console.log('Creating judging session...');
    // For judge endpoints, use a default judge ID (usually 1 for system) since judge_id isn't in the model
    const judgeId = 1; // Default system judge ID
    const judgingSession = await prisma.judgingSession.create({
      data: {
        judgeId: judgeId,
        attendanceTeamId: attendanceTeamId,
        eventContestId: eventContestId,
        status: 'IN_PROGRESS',
        startTime: new Date(),
        totalScore: 0
      }
    });
    
    // Step 6: Create judging session scores for each criteria
    console.log(`Creating scores for ${judgingTemplate.judgingtemplatecriteria.length} criteria...`);
    
    const scorePromises = judgingTemplate.judgingtemplatecriteria.map(criterion => 
      prisma.judgingSessionScore.create({
        data: {
          judgingSessionId: judgingSession.id,
          criterionId: criterion.id,
          criterionName: criterion.name,
          criterionDescription: criterion.description || '',
          criterionWeight: criterion.weight || 0,
          criterionType: criterion.evaluationType || 'POINTS',
          maxScore: criterion.maxScore || 10,
          score: 0, // Initialize with 0 instead of null
          selectedDiscreteText: '',
          comments: ''
        }
      })
    );
    
    await Promise.all(scorePromises);
    
    return NextResponse.json({
      judgingSession: judgingSession,
      message: 'Judging session created successfully'
    });
    
  } catch (error: any) {
    console.error('Error creating judging session:', error);
    return NextResponse.json(
      { error: `Failed to create judging session: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
