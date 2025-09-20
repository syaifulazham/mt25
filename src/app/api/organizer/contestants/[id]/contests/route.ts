import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/organizer/contestants/[id]/contests
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

    // Method 1: Get contests directly assigned to the contestant
    const directContestParticipation = await prisma.contestParticipation.findMany({
      where: { 
        contestantId 
      },
      include: {
        contest: true
      }
    });

    // Method 2: Get contests the contestant participates in through teams
    const teamContests = await prisma.teamMember.findMany({
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

    // Format direct contest participation
    const directContests = directContestParticipation.map((cp: any) => {
      return {
        participationType: 'direct',
        participationId: cp.id,
        contest: cp.contest,
        assignedAt: cp.createdAt || new Date() // Fallback if createdAt is undefined
      };
    });

    // Format team contest participation
    const teamParticipations: any[] = [];
    teamContests.forEach(membership => {
      if (membership.team && membership.team.eventcontestteam) {
        membership.team.eventcontestteam.forEach((ect: any) => {
          teamParticipations.push({
            participationType: 'team',
            participationId: membership.id,
            teamId: membership.team.id,
            teamName: membership.team.name,
            contest: ect.eventcontest.contest,
            event: ect.eventcontest.event,
            status: ect.status
          });
        });
      }
    });

    return NextResponse.json({
      directContests,
      teamParticipations
    });
  } catch (error) {
    console.error('Error retrieving contestant contests:', error);
    return NextResponse.json(
      { error: 'An error occurred while retrieving the contestant contests' },
      { status: 500 }
    );
  }
}
