import { NextResponse } from 'next/server';
import { getCurrentUser, hasRequiredRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';

// POST /api/organizer/teams
export async function POST(request: Request) {
  try {
    // Check authorization
    const user = await getCurrentUser();
    if (!user || !('role' in user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.contestId || !data.contingentId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, contestId, and contingentId are required' },
        { status: 400 }
      );
    }

    // Check if contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: data.contestId },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Check if contingent exists
    const contingent = await prisma.contingent.findUnique({
      where: { id: data.contingentId },
    });

    if (!contingent) {
      return NextResponse.json({ error: 'Contingent not found' }, { status: 404 });
    }

    // Generate a unique hashcode for the team
    const hashcode = generateTeamHashcode();

    // Create the team
    const newTeam = await prisma.team.create({
      data: {
        name: data.name,
        hashcode: hashcode,
        description: data.description || null,
        contestId: data.contestId,
        contingentId: data.contingentId,
        status: data.status || 'ACTIVE',
        maxMembers: data.maxMembers || 4,
      },
      include: {
        contest: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...newTeam,
      contestName: newTeam.contest.name,
      memberCount: 0
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while creating the team' },
      { status: 500 }
    );
  }
}

// Helper function to generate a unique team hashcode
function generateTeamHashcode(): string {
  // Generate a random 6-character alphanumeric code
  const code = randomBytes(4)
    .toString('hex')
    .substring(0, 6)
    .toUpperCase();
  
  return `TEAM-${code}`;
}
