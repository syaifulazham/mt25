import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for updating a team
const updateTeamSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).optional(),
  maxMembers: z.number().min(1).max(10).optional()
});

// GET handler - Get a specific team's details
export async function GET(
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
    
    // Get the team details
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        contest: {
          select: {
            id: true,
            name: true,
            code: true,
            contestType: true,
            startDate: true,
            endDate: true,
            minAge: true,
            maxAge: true
          }
        },
        contingent: {
          select: {
            id: true,
            name: true,
            school: {
              select: {
                name: true
              }
            },
            higherInstitution: {
              select: {
                name: true
              }
            },
            managers: {
              include: {
                participant: true
              }
            }
          }
        },
        members: {
          include: {
            contestant: {
              select: {
                id: true,
                name: true,
                ic: true,
                gender: true,
                age: true,
                edu_level: true,
                email: true,
                phoneNumber: true,
                status: true
              }
            }
          }
        },
        managers: {
          include: {
            participant: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
                phoneNumber: true
              }
            }
          }
        }
      }
    });
    
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    
    // Get current user's participant record based on email
    const participant = await prisma.user_participant.findFirst({
      where: { email: session.user?.email || '' }
    });
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Check if current user is a manager of this team directly
    const isTeamManager = team.managers.some(manager => 
      manager.participant.email === session.user?.email
    );
    
    // Check if current user is a manager of the team's contingent
    const isContingentManager = team.contingent.managers.some(manager => 
      manager.participant.email === session.user?.email
    );
    
    // Determine isOwner status
    const isOwner = team.managers.some(manager => 
      manager.participant.email === session.user?.email && manager.isOwner
    );
    
    // Format the team for the response
    const formattedTeam = {
      id: team.id,
      name: team.name,
      hashcode: team.hashcode,
      description: team.description,
      status: team.status,
      maxMembers: team.maxMembers,
      contestId: team.contestId,
      contestName: team.contest.name,
      minAge: team.contest?.minAge ?? undefined,
      maxAge: team.contest?.maxAge ?? undefined,
      contingentId: team.contingentId,
      contingentName: team.contingent.name,
      institutionName: team.contingent.school 
        ? team.contingent.school.name 
        : team.contingent.higherInstitution?.name || "Unknown",
      institutionType: team.contingent.school ? "school" : "higherInstitution",
      members: team.members.map(member => ({
        id: member.id,
        contestantId: member.contestantId,
        contestantName: member.contestant.name,
        status: member.contestant.status,
        joinDate: member.joinedAt,
        icNumber: member.contestant.ic,
        email: member.contestant.email,
        gender: member.contestant.gender,
        educationLevel: member.contestant.edu_level
      })),
      isOwner: isOwner,
      isManager: isTeamManager || isContingentManager,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    };
    
    return NextResponse.json(formattedTeam);
  } catch (error) {
    console.error("Error fetching team details:", error);
    return NextResponse.json(
      { error: "Failed to fetch team details" },
      { status: 500 }
    );
  }
}

// PATCH handler - Update a team
export async function PATCH(
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
    
    // Get the team with its contingent and check if the current user is a manager of the contingent
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        contingent: {
          include: {
            managers: {
              include: {
                participant: true
              }
            }
          }
        }
      }
    });
    
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    
    // Get the current participant user by email
    const currentParticipant = await prisma.user_participant.findUnique({
      where: { email: session.user?.email || '' }
    });
    
    if (!currentParticipant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Check if current user is a manager of the team's contingent
    const isContingentManager = team.contingent.managers.some(manager => 
      manager.participant.email === session.user?.email
    );
    
    if (!isContingentManager) {
      return NextResponse.json(
        { error: "You do not have permission to update this team. Only managers of this team's contingent can make changes." },
        { status: 403 }
      );
    }
    
    const json = await request.json();
    
    // Validate the request body
    const validationResult = updateTeamSchema.safeParse(json);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, description, status, maxMembers } = validationResult.data;
    
    // Update the team
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(maxMembers && { maxMembers })
      }
    });
    
    return NextResponse.json(updatedTeam);
  } catch (error: any) {
    console.error("Error updating team:", error);
    
    // Handle unique constraint violations
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: "A team with this name already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}

// DELETE handler - Delete a team
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
    
    // Get the team with its contingent to verify its existence and check permissions
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        contingent: {
          include: {
            managers: {
              include: {
                participant: true
              }
            }
          }
        },
        managers: {
          where: {
            isOwner: true
          },
          include: {
            participant: true
          }
        }
      }
    });
    
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    
    // Get the current participant user by email
    const currentParticipant = await prisma.user_participant.findUnique({
      where: { email: session.user?.email || '' }
    });
    
    if (!currentParticipant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Check if current user is a manager of the team's contingent
    const isContingentManager = team.contingent.managers.some(manager => 
      manager.participant.email === session.user?.email
    );
    
    if (!isContingentManager) {
      return NextResponse.json(
        { error: "You do not have permission to manage this team. Only managers of this team's contingent can access it." },
        { status: 403 }
      );
    }
    
    // Check if current user is the owner of this team
    const isOwner = team.managers.some(manager => 
      manager.isOwner && manager.participant.email === session.user?.email
    );
    
    if (!isOwner) {
      return NextResponse.json(
        { error: "Only the team owner can delete the team" },
        { status: 403 }
      );
    }
    
    // Delete the team - the related records in teamManager and teamMember will be 
    // automatically deleted due to the onDelete: Cascade relationship
    await prisma.team.delete({
      where: { id: teamId }
    });
    
    return NextResponse.json(
      { message: "Team deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 }
    );
  }
}
