import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';

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
    console.log('API: Received request for judging contests with eventId:', eventId);

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Validate eventId is a number
    const eventIdNum = parseInt(eventId);
    if (isNaN(eventIdNum)) {
      console.error('API Error: Invalid eventId format:', eventId);
      return NextResponse.json({ error: 'Invalid event ID format' }, { status: 400 });
    }

    // Fetch event contests with related contest data
    const eventContests = await prisma.eventcontest.findMany({
      where: {
        eventId: parseInt(eventId),
      },
      include: {
        contest: {
          include: {
            targetgroup: true, // Include target groups for grouping by schoolLevel
            judgingtemplate: true, // Include judging template data
          }
        },
      },
    });
    
    console.log('Event contests fetched:', JSON.stringify(eventContests.map(ec => ({
      id: ec.id,
      contestId: ec.contestId,
      contestName: ec.contest?.name,
      judgingTemplateId: ec.contest?.judgingTemplateId
    })), null, 2));
    
    // Log for debugging
    console.log(`Found ${eventContests.length} event contests for event ID ${eventId}`);

    // For each contest, fetch judging statistics
    const contestsWithStats = await Promise.all(eventContests.map(async (eventContest) => {
      try {
        // Get all attendance teams for this event contest based on eventId and contestId
        // First verify if the event_contest_team table exists and has the right columns
        const totalTeams = await prisma.$transaction(async (prisma) => {
          try {
            // Try first approach with eventcontestteam table (newer schema)
            const teams = await prisma.$queryRaw`
              SELECT COUNT(DISTINCT at.Id) as count
              FROM attendanceTeam at
              JOIN eventcontestteam ect ON ect.teamId = at.teamId
              WHERE ect.eventcontestId = ${eventContest.id}
              AND at.eventId = ${parseInt(eventId)}
            `;
            
            if (Array.isArray(teams) && teams.length > 0) {
              console.log(`Using eventcontestteam relation: ${Number(teams[0].count)} teams for contest ${eventContest.id}`);
              return Number(teams[0].count);
            }
            
            // Fallback to direct attendance team count for the contest in this event
            const directCount = await prisma.$queryRaw`
              SELECT COUNT(*) as count
              FROM attendanceTeam at
              WHERE at.eventId = ${parseInt(eventId)}
              AND at.contestId = ${eventContest.contestId}
            `;
            
            if (Array.isArray(directCount) && directCount.length > 0) {
              console.log(`Using direct attendanceTeam relation: ${Number(directCount[0].count)} teams for contest ${eventContest.id}`);
              return Number(directCount[0].count);
            }
            
            return 0;
          } catch (error) {
            console.error(`Error counting teams for contest ${eventContest.id}:`, error);
            return 0;
          }
        });
        
        console.log(`Contest ${eventContest.id}: Found ${totalTeams} attendance teams for event ${eventId}`);
        
        // Get teams with completed judging sessions
        const completedTeamSessions = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT attendanceTeamId) as count 
          FROM judgingSession 
          WHERE eventcontestId = ${eventContest.id} 
          AND status = 'COMPLETED'
        `;
        
        const judgedTeams = Array.isArray(completedTeamSessions) && completedTeamSessions.length > 0 
          ? Number(completedTeamSessions[0].count) 
          : 0;
        
        // Get teams with in-progress judging sessions (but not completed)
        const inProgressTeamSessions = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT attendanceTeamId) as count 
          FROM judgingSession 
          WHERE eventcontestId = ${eventContest.id} 
          AND status = 'IN_PROGRESS' 
          AND attendanceTeamId NOT IN (
            SELECT DISTINCT attendanceTeamId 
            FROM judgingSession 
            WHERE eventcontestId = ${eventContest.id} 
            AND status = 'COMPLETED'
          )
        `;
        
        const inProgressTeams = Array.isArray(inProgressTeamSessions) && inProgressTeamSessions.length > 0 
          ? Number(inProgressTeamSessions[0].count) 
          : 0;
        
        // Get judging template if assigned from the contest table
        // The judgingTemplateId is in the contest table, not eventcontest
        let judgingTemplate = null;
        let judgingTemplateId = null;
        
        // Check if the contest has a judgingTemplateId
        if (eventContest.contest && eventContest.contest.judgingTemplateId) {
          judgingTemplateId = eventContest.contest.judgingTemplateId;
          console.log(`Found judging template ID ${judgingTemplateId} for contest ID ${eventContest.contestId}`);
        } else {
          console.log(`No judging template found for contest ID ${eventContest.contestId}`);
        }
        
        if (judgingTemplateId) {
          judgingTemplate = await prisma.judgingtemplate.findUnique({
            where: {
              id: judgingTemplateId
            },
            select: {
              id: true,
              name: true,
              description: true
            }
          });
        }
        
        return {
          id: eventContest.id,
          contestId: eventContest.contestId,
          name: `${eventContest.contest.code || ''} - ${eventContest.contest.name}`,
          description: eventContest.contest.description,
          judgingTemplateId: judgingTemplateId,
          judgingtemplate: judgingTemplate,
          _count: {
            attendanceTeam: totalTeams,
          },
          stats: {
            totalTeams,
            judgedTeams,
            inProgressTeams,
          }
        };
      } catch (error) {
        console.error(`Error processing event contest ${eventContest.id}:`, error);
        // Return a minimal object if there's an error for this event contest
        return {
          id: eventContest.id,
          contestId: eventContest.contestId,
          name: `${eventContest.contest.code || ''} - ${eventContest.contest.name}`,
          description: eventContest.contest.description,
          judgingTemplateId: null,
          judgingtemplate: null,
          _count: {
            attendanceTeam: 0,
          },
          stats: {
            totalTeams: 0,
            judgedTeams: 0,
            inProgressTeams: 0,
          },
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }));
    
    return NextResponse.json({ 
      contests: contestsWithStats,
    });
    
  } catch (error) {
    console.error('Error fetching judging contests:', error);
    
    // More detailed error logging
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error code:', error.code);
      console.error('Prisma error meta:', error.meta);
      console.error('Prisma error message:', error.message);
    } else if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch contests', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
