import { prisma } from '@/lib/prisma';

/**
 * Get a judge session by hashcode and optional sessionId
 * If sessionId is provided, it will check if the session belongs to a judge endpoint with the given hashcode
 * If sessionId is not provided, it will return the first session associated with the hashcode
 */
export async function getJudgeSessionByHashcodeAndSessionId(hashcode: string, sessionId?: number) {
  try {
    console.log(`Searching for judge endpoint with hashcode: ${hashcode}`);
    
    // Find the judge endpoint with the given hashcode using exact match
    const judgeEndpoint = await prisma.judges_endpoints.findFirst({
      where: {
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
            name: true
          }
        }
      }
    });
    
    if (!judgeEndpoint) {
      console.error(`Judge endpoint not found for hashcode: ${hashcode}`);
      
      // Debug: Let's check if there are any judge endpoints with similar hashcodes
      const similarEndpoints = await prisma.judges_endpoints.findMany({
        where: {
          hashcode: {
            contains: hashcode.substring(0, 10)
          }
        },
        select: {
          id: true,
          hashcode: true,
          judge_name: true
        },
        take: 5
      });
      
      console.log(`Similar judge endpoints: ${JSON.stringify(similarEndpoints)}`);
      return null;
    }
    
    console.log(`Found judge endpoint: ${judgeEndpoint.id} (${judgeEndpoint.judge_name})`);

    // If sessionId is provided, validate that it belongs to this contest/event
    if (sessionId) {
      // Find judging session by ID
      const session = await prisma.judgingSession.findFirst({
        where: {
          id: sessionId,
          // Lookup by eventContestId that would match the judge's eventId/contestId
          eventcontest: {
            eventId: judgeEndpoint.eventId,
            contestId: judgeEndpoint.contestId
          }
        },
        include: {
          judgingSessionScore: true, // Correct field name from schema
          attendanceTeam: true,      // This is the team relation
          eventcontest: true         // Include event contest details
        }
      });
      
      if (!session) {
        console.error(`Session ${sessionId} not found for judge endpoint with hashcode ${hashcode}`);
        return null;
      }
      
      console.log(`Found session ${session.id} for team ${session.attendanceTeamId}`);
      return session;
    }
    
    // If no sessionId provided, get sessions for this contest/event
    const sessions = await prisma.judgingSession.findMany({
      where: {
        eventcontest: {
          eventId: judgeEndpoint.eventId,
          contestId: judgeEndpoint.contestId
        }
      },
      include: {
        judgingSessionScore: true,
        attendanceTeam: true,
        eventcontest: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    if (sessions.length === 0) {
      console.error(`No sessions found for judge endpoint with hashcode ${hashcode}`);
      return null;
    }
    
    console.log(`Found ${sessions.length} sessions, returning most recent`);
    return sessions[0]; // Return the most recent session
    
  } catch (error) {
    console.error('Error in getJudgeSessionByHashcodeAndSessionId:', error);
    return null;
  }
}

/**
 * Validate if a judge has access to a specific session
 */
export async function validateJudgeSessionAccess(hashcode: string, sessionId: number) {
  try {
    // Get the judge session
    const session = await getJudgeSessionByHashcodeAndSessionId(hashcode, sessionId);
    return !!session;
  } catch (error) {
    console.error('Error validating judge session access:', error);
    return false;
  }
}
