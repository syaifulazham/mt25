import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { getZoneStatistics } from '@/app/organizer/events/stats/_utils/zone-statistics';

export async function GET(
  request: Request,
  { params }: { params: { zoneId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !session.user.roles.includes(Role.ADMIN)) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  try {
    const zoneId = parseInt(params.zoneId);
    const zoneStatsResult = await getZoneStatistics({ zoneId });

    // Create detailed debugging information
    const debugInfo = {
      globalTeamCount: 0,
      contingentTeamSum: 0,
      difference: 0,
      teamsInMultipleContingents: [],
      contingentTeamCounts: []
    };

    // Get teams and count them
    const teams = await prisma.team.findMany({
      where: {
        zoneId: zoneId
      },
      include: {
        eventcontestteam: true
      }
    });

    // Count unique teams with eventcontestteam entries
    const globalUniqueTeams = new Set<number>();
    for (const team of teams) {
      if (team.eventcontestteam.length > 0) {
        globalUniqueTeams.add(team.id);
      }
    }
    debugInfo.globalTeamCount = globalUniqueTeams.size;

    // Calculate sum of teams across contingents
    let totalTeamsInContingents = 0;
    const contingentTeamCounts = [];
    for (const stateSummary of zoneStatsResult.stateSummary) {
      for (const contingent of stateSummary.contingents) {
        totalTeamsInContingents += contingent.totalTeams;
        contingentTeamCounts.push({
          contingentId: contingent.id,
          contingentName: contingent.displayName,
          teamCount: contingent.totalTeams
        });
      }
    }
    debugInfo.contingentTeamSum = totalTeamsInContingents;
    debugInfo.difference = globalUniqueTeams.size - totalTeamsInContingents;
    debugInfo.contingentTeamCounts = contingentTeamCounts;

    // Find teams in multiple contingents
    const teamToContingentsMap = new Map<number, any[]>();
    
    // Initialize map
    for (const teamId of globalUniqueTeams) {
      teamToContingentsMap.set(teamId, []);
    }

    // Map teams to their contingents
    for (const team of teams) {
      if (team.eventcontestteam.length > 0) {
        const contingentInfo = teamToContingentsMap.get(team.id) || [];
        contingentInfo.push({
          contingentId: team.contingentId,
          teamId: team.id,
          teamName: team.name
        });
        teamToContingentsMap.set(team.id, contingentInfo);
      }
    }

    // Find teams with multiple contingents
    const teamsInMultipleContingents = [];
    for (const [teamId, contingents] of teamToContingentsMap.entries()) {
      if (contingents.length > 1) {
        teamsInMultipleContingents.push({
          teamId,
          contingents
        });
      }
    }
    debugInfo.teamsInMultipleContingents = teamsInMultipleContingents;

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Error in debug team counts:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
