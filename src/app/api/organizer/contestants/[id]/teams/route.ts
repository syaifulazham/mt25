import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/organizer/contestants/[id]/teams
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization using getServerSession
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check user role
    const userRole = session.user.role;
    if (!['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER'].includes(userRole as string)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const contestantId = parseInt(params.id);
    if (isNaN(contestantId)) {
      return NextResponse.json({ error: 'Invalid contestant ID' }, { status: 400 });
    }

    // Get all teams the contestant is a member of with related event and contest details
    const teams = await prisma.teamMember.findMany({
      where: { 
        contestantId 
      },
      include: {
        team: {
          include: {
            eventcontestteam: {
              include: {
                eventcontest: {
                  include: {
                    event: true,
                    contest: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Format the response to make it more readable
    const formattedTeams = teams.map(membership => {
      // Extract event contest registrations with more context
      const eventRegistrations = membership.team.eventcontestteam.map((ect: any) => {
        return {
          id: ect.id,
          status: ect.status,
          event: ect.eventcontest.event,
          contest: ect.eventcontest.contest
        };
      });

      return {
        teamMemberId: membership.id,
        role: membership.role,
        team: {
          id: membership.team.id,
          name: membership.team.name,
          status: membership.team.status,
          eventRegistrations
        }
      };
    });

    return NextResponse.json(formattedTeams);
  } catch (error) {
    console.error('Error retrieving contestant teams:', error);
    return NextResponse.json(
      { error: 'An error occurred while retrieving the contestant teams' },
      { status: 500 }
    );
  }
}
