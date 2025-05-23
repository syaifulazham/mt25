import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET handler - Get available event contests for a team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const teamId = parseInt(params.id);
    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: 'Invalid team ID' },
        { status: 400 }
      );
    }

    // First, get the team to check contest and contingent
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        contingent: {
          include: {
            school: {
              include: {
                state: {
                  include: { zone: true }
                }
              }
            },
            higherInstitution: {
              include: {
                state: {
                  include: { zone: true }
                }
              }
            },
            independent: {
              include: {
                state: {
                  include: { zone: true }
                }
              }
            }
          }
        },
        contest: true
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Get team's contingent state and zone
    const contingentState = team.contingent.school?.state?.name || 
                          team.contingent.higherInstitution?.state?.name || 
                          team.contingent.independent?.state?.name;
    
    const contingentZone = team.contingent.school?.state?.zone?.name || 
                          team.contingent.higherInstitution?.state?.zone?.name || 
                          team.contingent.independent?.state?.zone?.name;

    // Get the team's zone and state IDs for filtering events
    const zoneId = team.contingent.school?.state?.zone?.id || 
                  team.contingent.higherInstitution?.state?.zone?.id || 
                  team.contingent.independent?.state?.zone?.id;
    
    const stateId = team.contingent.school?.state?.id || 
                   team.contingent.higherInstitution?.state?.id || 
                   team.contingent.independent?.state?.id;

    // Use raw SQL to get available event contests with registration status
    const result = await prisma.$queryRaw`
      SELECT 
        ec.id, 
        ec.eventId, 
        ev.name as eventName, 
        ec.contestId, 
        c.name as contestName,
        ec.maxteampercontingent,
        ev.scopeArea,
        ect.id as registrationId,
        ect.teamPriority,
        ect.status as registrationStatus
      FROM 
        eventcontest ec
      JOIN 
        event ev ON ec.eventId = ev.id
      JOIN 
        contest c ON ec.contestId = c.id
      LEFT JOIN 
        eventcontestteam ect ON ec.id = ect.eventcontestId AND ect.teamId = ${teamId}
      WHERE 
        ec.isActive = true 
        AND ev.isActive = true
        AND ec.contestId = ${team.contestId}
        AND (
          ev.scopeArea = 'OPEN'
          OR (ev.scopeArea = 'ZONE' AND ev.zoneId = ${zoneId || null})
          OR (ev.scopeArea = 'STATE' AND ev.stateId = ${stateId || null})
        )
      ORDER BY 
        ev.name, c.name
    `;

    // Format the response
    const formattedEventContests = Array.isArray(result) ? result.map(ec => ({
      id: ec.id,
      eventId: ec.eventId,
      eventName: ec.eventName,
      contestId: ec.contestId,
      contestName: ec.contestName,
      maxteampercontingent: ec.maxteampercontingent,
      scopeArea: ec.scopeArea,
      isRegistered: ec.registrationId !== null,
      registration: ec.registrationId ? {
        id: ec.registrationId,
        teamPriority: ec.teamPriority,
        status: ec.registrationStatus
      } : null,
      zoneEligible: ec.scopeArea === 'ZONE' ? contingentZone : null,
      stateEligible: ec.scopeArea === 'STATE' ? contingentState : null
    })) : [];

    return NextResponse.json(formattedEventContests);
  } catch (error) {
    console.error('Error fetching available event contests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available event contests' },
      { status: 500 }
    );
  }
}
