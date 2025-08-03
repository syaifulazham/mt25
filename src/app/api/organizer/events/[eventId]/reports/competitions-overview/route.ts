import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = parseInt(params.eventId);
    
    // First, get the event details to determine scopeArea
    const eventResult = await prisma.$queryRaw<any[]>`
      SELECT scopeArea FROM event WHERE id = ${eventId}
    `;
    
    if (!eventResult || eventResult.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    const scopeArea = eventResult[0].scopeArea;
    
    // Get detailed contest data
    let contestsQuery;
    
    if (scopeArea === 'ZONE') {
      // Get individual contest data with state grouping for ZONE events
      contestsQuery = `
        SELECT 
          c.name as contestName,
          c.id as contestId,
          ac.contestGroup,
          s.name as stateName,
          s.id as stateId,
          COUNT(DISTINCT ac.contingentId) as contingentCount,
          COUNT(DISTINCT ac.teamId) as teamCount,
          COUNT(DISTINCT ac.contestantId) as contestantCount
        FROM attendanceContestant ac
        LEFT JOIN team t ON ac.teamId = t.id
        LEFT JOIN contest c ON t.contestId = c.id
        LEFT JOIN contingent cont ON ac.contingentId = cont.id
        LEFT JOIN school sch ON cont.schoolId = sch.id
        LEFT JOIN higherinstitution hi ON cont.higherInstId = hi.id
        LEFT JOIN independent ind ON cont.independentId = ind.id
        LEFT JOIN state s ON (
          CASE 
            WHEN cont.contingentType = 'SCHOOL' AND sch.stateId IS NOT NULL THEN sch.stateId
            WHEN cont.contingentType = 'HIGHER_INSTITUTION' AND hi.stateId IS NOT NULL THEN hi.stateId
            WHEN cont.contingentType = 'INDEPENDENT' AND ind.stateId IS NOT NULL THEN ind.stateId
            ELSE NULL
          END
        ) = s.id
        WHERE ac.eventId = ${eventId}
        GROUP BY c.id, c.name, ac.contestGroup, s.id, s.name
        ORDER BY s.name, ac.contestGroup, c.name
      `;
    } else {
      // Get individual contest data grouped by contestGroup only for STATE/NATIONAL events
      contestsQuery = `
        SELECT 
          c.name as contestName,
          c.id as contestId,
          ac.contestGroup,
          NULL as stateName,
          NULL as stateId,
          COUNT(DISTINCT ac.contingentId) as contingentCount,
          COUNT(DISTINCT ac.teamId) as teamCount,
          COUNT(DISTINCT ac.contestantId) as contestantCount
        FROM attendanceContestant ac
        LEFT JOIN team t ON ac.teamId = t.id
        LEFT JOIN contest c ON t.contestId = c.id
        WHERE ac.eventId = ${eventId}
        GROUP BY c.id, c.name, ac.contestGroup
        ORDER BY ac.contestGroup, c.name
      `;
    }
    
    const contestsData = await prisma.$queryRawUnsafe(contestsQuery) as any[];
    
    // Get state-level summaries (for ZONE events)
    let stateSummaries = [];
    if (scopeArea === 'ZONE') {
      const stateSummaryQuery = `
        SELECT 
          s.name as stateName,
          s.id as stateId,
          COUNT(DISTINCT ac.contingentId) as totalContingents,
          COUNT(DISTINCT ac.teamId) as totalTeams,
          COUNT(DISTINCT ac.contestantId) as totalContestants,
          COUNT(DISTINCT c.id) as totalContests
        FROM attendanceContestant ac
        LEFT JOIN team t ON ac.teamId = t.id
        LEFT JOIN contest c ON t.contestId = c.id
        LEFT JOIN contingent cont ON ac.contingentId = cont.id
        LEFT JOIN school sch ON cont.schoolId = sch.id
        LEFT JOIN higherinstitution hi ON cont.higherInstId = hi.id
        LEFT JOIN independent ind ON cont.independentId = ind.id
        LEFT JOIN state s ON (
          CASE 
            WHEN cont.contingentType = 'SCHOOL' AND sch.stateId IS NOT NULL THEN sch.stateId
            WHEN cont.contingentType = 'HIGHER_INSTITUTION' AND hi.stateId IS NOT NULL THEN hi.stateId
            WHEN cont.contingentType = 'INDEPENDENT' AND ind.stateId IS NOT NULL THEN ind.stateId
            ELSE NULL
          END
        ) = s.id
        WHERE ac.eventId = ${eventId}
        GROUP BY s.id, s.name
        ORDER BY s.name
      `;
      stateSummaries = await prisma.$queryRawUnsafe(stateSummaryQuery) as any[];
    }
    
    // Get contest group summaries
    let contestGroupSummaries;
    if (scopeArea === 'ZONE') {
      // Contest group summaries by state for ZONE events
      contestGroupSummaries = await prisma.$queryRawUnsafe(`
        SELECT 
          s.name as stateName,
          s.id as stateId,
          ac.contestGroup,
          COUNT(DISTINCT ac.contingentId) as totalContingents,
          COUNT(DISTINCT ac.teamId) as totalTeams,
          COUNT(DISTINCT ac.contestantId) as totalContestants,
          COUNT(DISTINCT c.id) as totalContests
        FROM attendanceContestant ac
        LEFT JOIN team t ON ac.teamId = t.id
        LEFT JOIN contest c ON t.contestId = c.id
        LEFT JOIN contingent cont ON ac.contingentId = cont.id
        LEFT JOIN school sch ON cont.schoolId = sch.id
        LEFT JOIN higherinstitution hi ON cont.higherInstId = hi.id
        LEFT JOIN independent ind ON cont.independentId = ind.id
        LEFT JOIN state s ON (
          CASE 
            WHEN cont.contingentType = 'SCHOOL' AND sch.stateId IS NOT NULL THEN sch.stateId
            WHEN cont.contingentType = 'HIGHER_INSTITUTION' AND hi.stateId IS NOT NULL THEN hi.stateId
            WHEN cont.contingentType = 'INDEPENDENT' AND ind.stateId IS NOT NULL THEN ind.stateId
            ELSE NULL
          END
        ) = s.id
        WHERE ac.eventId = ${eventId}
        GROUP BY s.id, s.name, ac.contestGroup
        ORDER BY s.name, ac.contestGroup
      `) as any[];
    } else {
      // Contest group summaries for STATE/NATIONAL events
      contestGroupSummaries = await prisma.$queryRawUnsafe(`
        SELECT 
          NULL as stateName,
          NULL as stateId,
          ac.contestGroup,
          COUNT(DISTINCT ac.contingentId) as totalContingents,
          COUNT(DISTINCT ac.teamId) as totalTeams,
          COUNT(DISTINCT ac.contestantId) as totalContestants,
          COUNT(DISTINCT c.id) as totalContests
        FROM attendanceContestant ac
        LEFT JOIN team t ON ac.teamId = t.id
        LEFT JOIN contest c ON t.contestId = c.id
        WHERE ac.eventId = ${eventId}
        GROUP BY ac.contestGroup
        ORDER BY ac.contestGroup
      `) as any[];
    }
    
    // Get total summary
    const totalSummaryResult = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(DISTINCT ac.contingentId) as totalContingents,
        COUNT(DISTINCT ac.teamId) as totalTeams,
        COUNT(DISTINCT ac.contestantId) as totalContestants,
        COUNT(DISTINCT c.id) as totalContests
      FROM attendanceContestant ac
      LEFT JOIN team t ON ac.teamId = t.id
      LEFT JOIN contest c ON t.contestId = c.id
      WHERE ac.eventId = ${eventId}
    `;
    
    const totalSummary = totalSummaryResult[0] || {
      totalContingents: 0,
      totalTeams: 0,
      totalContestants: 0,
      totalContests: 0
    };

    // Convert BigInt values to numbers for JSON serialization
    const processedContests = contestsData.map(item => ({
      ...item,
      contestId: Number(item.contestId),
      stateId: item.stateId ? Number(item.stateId) : null,
      contingentCount: Number(item.contingentCount),
      teamCount: Number(item.teamCount),
      contestantCount: Number(item.contestantCount)
    }));

    const processedStateSummaries = stateSummaries.map(item => ({
      ...item,
      stateId: Number(item.stateId),
      totalContingents: Number(item.totalContingents),
      totalTeams: Number(item.totalTeams),
      totalContestants: Number(item.totalContestants),
      totalContests: Number(item.totalContests)
    }));

    const processedContestGroupSummaries = (contestGroupSummaries as any[]).map(item => ({
      ...item,
      stateId: item.stateId ? Number(item.stateId) : null,
      totalContingents: Number(item.totalContingents),
      totalTeams: Number(item.totalTeams),
      totalContestants: Number(item.totalContestants),
      totalContests: Number(item.totalContests)
    }));

    const processedGeneralSummary = {
      totalContingents: Number(totalSummary.totalContingents),
      totalTeams: Number(totalSummary.totalTeams),
      totalContestants: Number(totalSummary.totalContestants),
      totalContests: Number(totalSummary.totalContests)
    };

    // Structure the hierarchical response
    const hierarchicalData = {
      generalSummary: processedGeneralSummary,
      states: [] as any[]
    };

    if (scopeArea === 'ZONE') {
      // For ZONE events: Group by state, then contest group, then contests
      processedStateSummaries.forEach(stateSummary => {
        const stateData = {
          stateName: stateSummary.stateName,
          stateId: stateSummary.stateId,
          stateSummary: {
            totalContingents: stateSummary.totalContingents,
            totalTeams: stateSummary.totalTeams,
            totalContestants: stateSummary.totalContestants,
            totalContests: stateSummary.totalContests
          },
          contestGroups: [] as any[]
        };

        // Get contest groups for this state
        const stateContestGroups = processedContestGroupSummaries.filter(
          cg => cg.stateId === stateSummary.stateId
        );

        stateContestGroups.forEach(contestGroupSummary => {
          const contestGroupData = {
            contestGroup: contestGroupSummary.contestGroup,
            contestGroupSummary: {
              totalContingents: contestGroupSummary.totalContingents,
              totalTeams: contestGroupSummary.totalTeams,
              totalContestants: contestGroupSummary.totalContestants,
              totalContests: contestGroupSummary.totalContests
            },
            contests: processedContests.filter(
              contest => contest.stateId === stateSummary.stateId && 
                        contest.contestGroup === contestGroupSummary.contestGroup
            )
          };
          stateData.contestGroups.push(contestGroupData);
        });

        hierarchicalData.states.push(stateData);
      });
    } else {
      // For STATE/NATIONAL events: Group by contest group only
      const singleState = {
        stateName: null,
        stateId: null,
        stateSummary: processedGeneralSummary,
        contestGroups: [] as any[]
      };

      processedContestGroupSummaries.forEach(contestGroupSummary => {
        const contestGroupData = {
          contestGroup: contestGroupSummary.contestGroup,
          contestGroupSummary: {
            totalContingents: contestGroupSummary.totalContingents,
            totalTeams: contestGroupSummary.totalTeams,
            totalContestants: contestGroupSummary.totalContestants,
            totalContests: contestGroupSummary.totalContests
          },
          contests: processedContests.filter(
            contest => contest.contestGroup === contestGroupSummary.contestGroup
          )
        };
        singleState.contestGroups.push(contestGroupData);
      });

      hierarchicalData.states.push(singleState);
    }

    return NextResponse.json({
      scopeArea,
      data: hierarchicalData
    });

  } catch (error) {
    console.error('Error fetching competitions overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitions overview' },
      { status: 500 }
    );
  }
}
