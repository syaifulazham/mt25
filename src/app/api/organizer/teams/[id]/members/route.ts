import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasRequiredRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// Schema for adding a contestant to a team
const addMemberSchema = z.object({
  contestantId: z.number({
    required_error: "Contestant ID is required",
    invalid_type_error: "Contestant ID must be a number"
  }),
  role: z.string().optional()
});

// Schema for removing a contestant from a team
const removeMemberSchema = z.object({
  teamMemberId: z.number({
    required_error: "Team Member ID is required",
    invalid_type_error: "Team Member ID must be a number"
  })
});

// GET /api/organizer/teams/[id]/members
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has required role (ADMIN or OPERATOR)
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OPERATOR') {
      return NextResponse.json(
        { error: "You do not have permission to view team members" },
        { status: 403 }
      );
    }

    const teamId = parseInt(params.id);
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get team members with contestant details
    const members = await prisma.teamMember.findMany({
      where: {
        teamId: teamId,
      },
      include: {
        contestant: true,
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error retrieving team members:', error);
    return NextResponse.json(
      { error: 'An error occurred while retrieving team members' },
      { status: 500 }
    );
  }
}

// POST /api/organizer/teams/[id]/members
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has required role (ADMIN or OPERATOR)
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OPERATOR') {
      return NextResponse.json(
        { error: "You do not have permission to add team members" },
        { status: 403 }
      );
    }

    const teamId = parseInt(params.id);
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
    }

    const json = await request.json();
    
    // Validate the request body
    const validationResult = addMemberSchema.safeParse(json);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { contestantId, role } = validationResult.data;

    // Check if team exists and get max members
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: { id: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if team is at max capacity
    if (team.members.length >= team.maxMembers) {
      return NextResponse.json(
        { error: `Team has reached its maximum capacity of ${team.maxMembers} members` },
        { status: 400 }
      );
    }

    // Check if contestant exists
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
    });

    if (!contestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 });
    }

    // Check if contestant belongs to the same contingent as the team
    if (contestant.contingentId !== team.contingentId) {
      return NextResponse.json(
        { error: "Contestant must belong to the same contingent as the team" },
        { status: 400 }
      );
    }

    // Check if contestant is already a member of this team
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        contestantId: contestantId,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'Contestant is already a member of this team' },
        { status: 409 }
      );
    }

    // Create the team membership
    const newMember = await prisma.teamMember.create({
      data: {
        teamId: teamId,
        contestantId: contestantId,
        role: role || null,
      },
      include: {
        contestant: true,
      },
    });

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json(
      { error: 'An error occurred while adding the team member' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizer/teams/[id]/members - Remove a member from a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has required role (ADMIN or OPERATOR)
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OPERATOR') {
      return NextResponse.json(
        { error: "You do not have permission to remove team members" },
        { status: 403 }
      );
    }
    
    const teamId = parseInt(params.id);
    
    if (isNaN(teamId)) {
      return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
    }
    
    const json = await request.json();
    
    // Validate the request body
    const validationResult = removeMemberSchema.safeParse(json);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { teamMemberId } = validationResult.data;
    
    // Get the team to verify its existence
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });
    
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    
    // Verify the team member exists and belongs to this team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id: teamMemberId,
        teamId: teamId
      },
      include: {
        contestant: true
      }
    });
    
    if (!teamMember) {
      return NextResponse.json(
        { error: "Team member not found or does not belong to this team" },
        { status: 404 }
      );
    }
    
    // Remove the contestant from the team
    await prisma.teamMember.delete({
      where: { id: teamMemberId }
    });
    
    return NextResponse.json(
      { message: "Team member removed successfully", teamMember },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
}
