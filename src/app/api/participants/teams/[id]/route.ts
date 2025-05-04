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
            endDate: true
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
    
    // Format the team for the response
    const formattedTeam = {
      id: team.id,
      name: team.name,
      hashcode: team.hashcode,
      description: team.description,
      status: team.status,
      maxMembers: team.maxMembers,
      contest: team.contest,
      contingent: {
        id: team.contingent.id,
        name: team.contingent.name,
        institution: team.contingent.school 
          ? team.contingent.school.name 
          : team.contingent.higherInstitution?.name || "Unknown"
      },
      members: team.members.map(member => ({
        id: member.id,
        contestant: member.contestant,
        role: member.role,
        joinedAt: member.joinedAt
      })),
      managers: team.managers.map(manager => ({
        id: manager.id,
        participant: manager.participant,
        isOwner: manager.isOwner,
        createdAt: manager.createdAt
      })),
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
        { error: "You do not have permission to update this team" },
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
  } catch (error) {
    console.error("Error updating team:", error);
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
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
    
    // Get the team to verify its existence and check if the current user is the owner
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
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
    
    // Check if current user is the owner of this team
    // Use email to match the participants since we don't have direct access to participant ID in the session
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
