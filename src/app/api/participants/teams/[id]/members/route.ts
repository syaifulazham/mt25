import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import { z } from "zod";

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

// POST handler - Add a contestant to a team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const teamId = parseInt(params.id);
    
    if (isNaN(teamId)) {
      return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
    }
    
    // Get the team to verify its existence and check if the current user is a manager
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        managers: {
          include: {
            participant: true
          }
        },
        members: true
      }
    });
    
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    
    // Check if current user is a manager of this team
    // Use email to match the participants since we don't have direct access to participant ID in the session
    const isManager = team.managers.some(manager => 
      manager.participant.email === session.user?.email
    );
    
    if (!isManager) {
      return NextResponse.json(
        { error: "You do not have permission to add members to this team" },
        { status: 403 }
      );
    }
    
    // Check if the team is already at maximum capacity
    if (team.members.length >= team.maxMembers) {
      return NextResponse.json(
        { error: `This team already has the maximum number of members (${team.maxMembers})` },
        { status: 400 }
      );
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
    
    // Verify the contestant exists
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      include: {
        contingent: true
      }
    });
    
    if (!contestant) {
      return NextResponse.json({ error: "Contestant not found" }, { status: 404 });
    }
    
    // Verify the contestant belongs to the same contingent as the team
    if (contestant.contingentId !== team.contingentId) {
      return NextResponse.json(
        { error: "Contestant must belong to the same contingent as the team" },
        { status: 400 }
      );
    }
    
    // Check if the contestant is already a member of this team
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        contestantId: contestantId
      }
    });
    
    if (existingMembership) {
      return NextResponse.json(
        { error: "This contestant is already a member of this team" },
        { status: 409 }
      );
    }
    
    // Add the contestant to the team
    const teamMember = await prisma.teamMember.create({
      data: {
        teamId,
        contestantId,
        role
      },
      include: {
        contestant: {
          select: {
            name: true,
            email: true,
            gender: true,
            edu_level: true
          }
        }
      }
    });
    
    return NextResponse.json(teamMember, { status: 201 });
  } catch (error) {
    console.error("Error adding team member:", error);
    return NextResponse.json(
      { error: "Failed to add contestant to team" },
      { status: 500 }
    );
  }
}

// DELETE handler - Remove a contestant from a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const teamId = parseInt(params.id);
    
    if (isNaN(teamId)) {
      return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
    }
    
    // Get the query parameters
    const searchParams = request.nextUrl.searchParams;
    const teamMemberIdParam = searchParams.get("teamMemberId");
    
    if (!teamMemberIdParam) {
      return NextResponse.json({ error: "Team Member ID is required" }, { status: 400 });
    }
    
    const teamMemberId = parseInt(teamMemberIdParam);
    
    if (isNaN(teamMemberId)) {
      return NextResponse.json({ error: "Invalid Team Member ID" }, { status: 400 });
    }
    
    // Get the team to verify its existence and check if the current user is a manager
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        managers: {
          include: {
            participant: true
          }
        }
      }
    });
    
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    
    // Check if current user is a manager of this team
    // Use email to match the participants since we don't have direct access to participant ID in the session
    const isManager = team.managers.some(manager => 
      manager.participant.email === session.user?.email
    );
    
    if (!isManager) {
      return NextResponse.json(
        { error: "You do not have permission to remove members from this team" },
        { status: 403 }
      );
    }
    
    // Verify the team member exists and belongs to this team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id: teamMemberId,
        teamId: teamId
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
      { message: "Team member removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Failed to remove contestant from team" },
      { status: 500 }
    );
  }
}
