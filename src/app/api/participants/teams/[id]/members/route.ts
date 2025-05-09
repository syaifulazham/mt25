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
        contest: {
          select: {
            maxMembersPerTeam: true
          }
        },
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
    
    // Or check if current user is a manager of the team's contingent
    const isContingentManager = team.contingent.managers.some(manager => 
      manager.participant.email === session.user?.email
    );
    
    if (!isTeamManager && !isContingentManager) {
      return NextResponse.json(
        { error: "You do not have permission to add members to this team" },
        { status: 403 }
      );
    }
    
    // Check if the team is already at maximum capacity
    // Use contest's maxMembersPerTeam if available, otherwise fall back to team's maxMembers
    const maxAllowedMembers = team.contest?.maxMembersPerTeam || team.maxMembers;
    
    if (team.members.length >= maxAllowedMembers) {
      return NextResponse.json(
        { error: `This team already has the maximum number of members (${maxAllowedMembers})` },
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
    await prisma.teamMember.create({
      data: {
        teamId,
        contestantId,
        role
      }
    });
    
    // Get the updated team with all members and permissions
    const updatedTeam = await prisma.team.findUnique({
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
            maxAge: true,
            maxMembersPerTeam: true
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
                status: true,
                class_grade: true,
                class_name: true
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
    
    if (!updatedTeam) {
      return NextResponse.json({ error: "Failed to retrieve updated team" }, { status: 500 });
    }
    
    // Format the members for the response
    const formattedMembers = updatedTeam.members.map(member => ({
      id: member.id,
      contestantId: member.contestantId,
      contestantName: member.contestant.name,
      status: member.contestant.status || "ACTIVE",
      // Use the current date for newly added members
      joinDate: new Date().toISOString(),
      icNumber: member.contestant.ic,
      email: member.contestant.email,
      gender: member.contestant.gender,
      educationLevel: member.contestant.edu_level,
      classGrade: member.contestant.class_grade,
      className: member.contestant.class_name
    }));
    
    // Check if current user is a manager of this team
    const isOwner = updatedTeam.managers.some(manager => 
      manager.participant.email === session.user?.email && manager.isOwner
    );
    
    // Check if current user is a manager of this team (owner or not)
    const isUserTeamManager = updatedTeam.managers.some(manager => 
      manager.participant.email === session.user?.email
    );
    
    // Check if current user is a manager of the team's contingent
    const isUserContingentManager = updatedTeam.contingent.managers.some(manager => 
      manager.participant.email === session.user?.email
    );
    
    // Get institution name from either school or higher institution
    const institutionName = updatedTeam.contingent.school?.name || updatedTeam.contingent.higherInstitution?.name || "";
    // Determine institution type
    const institutionType = updatedTeam.contingent.school ? "school" : "higherInstitution";
    
    // Format the response with simplified properties
    const formattedResponse = {
      id: updatedTeam.id,
      name: updatedTeam.name,
      hashcode: updatedTeam.hashcode,
      description: updatedTeam.description,
      status: updatedTeam.status,
      contestId: updatedTeam.contestId,
      contestName: updatedTeam.contest.name,
      contestMaxMembers: updatedTeam.contest.maxMembersPerTeam,
      contingentId: updatedTeam.contingentId,
      contingentName: updatedTeam.contingent.name,
      institutionName: institutionName,
      institutionType: institutionType,
      maxMembers: updatedTeam.maxMembers,
      isOwner: isOwner,
      isManager: isUserTeamManager || isUserContingentManager,
      minAge: updatedTeam.contest.minAge,
      maxAge: updatedTeam.contest.maxAge,
      createdAt: updatedTeam.createdAt,
      updatedAt: updatedTeam.updatedAt,
      members: formattedMembers
    };
    
    return NextResponse.json(formattedResponse, { status: 201 });
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
    
    // Get the team member ID from the request body
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
    
    if (isNaN(teamMemberId)) {
      return NextResponse.json({ error: "Invalid Team Member ID" }, { status: 400 });
    }
    
    // Get the team to verify its existence and check if the current user is a manager
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
          include: {
            participant: true
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
    
    // Or check if current user is a manager of the team's contingent
    const isContingentManager = team.contingent.managers.some(manager => 
      manager.participant.email === session.user?.email
    );
    
    if (!isTeamManager && !isContingentManager) {
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
    
    // Get the updated team data with all necessary fields
    const updatedTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        contest: {
          select: {
            name: true,
            maxMembersPerTeam: true,
            minAge: true,
            maxAge: true
          }
        },
        contingent: {
          include: {
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
                participant: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
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
                status: true,
                class_grade: true,
                class_name: true
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
    
    if (!updatedTeam) {
      return NextResponse.json({ error: "Team not found after update" }, { status: 404 });
    }
    
    // Format the members for the response
    const formattedMembers = updatedTeam.members.map((member: any) => ({
      id: member.id,
      contestantId: member.contestantId,
      contestantName: member.contestant.name,
      status: member.contestant.status || "ACTIVE",
      // Use current date for join date since the createdAt field may not be available
      joinDate: new Date().toISOString(),
      icNumber: member.contestant.ic,
      email: member.contestant.email,
      gender: member.contestant.gender,
      educationLevel: member.contestant.edu_level,
      classGrade: member.contestant.class_grade,
      className: member.contestant.class_name
    }));
    
    // Check if current user is a manager of this team
    const isOwner = updatedTeam.managers.some(manager => 
      manager.participant.email === session.user?.email && manager.isOwner
    );
    
    // Check if current user is a manager of this team (owner or not)
    const isUserTeamManager = updatedTeam.managers.some(manager => 
      manager.participant.email === session.user?.email
    );
    
    // Check if current user is a manager of the team's contingent
    const isUserContingentManager = updatedTeam.contingent.managers.some(manager => 
      manager.participant.email === session.user?.email
    );
    
    // Get institution name from either school or higher institution
    const institutionName = updatedTeam.contingent.school?.name || updatedTeam.contingent.higherInstitution?.name || "";
    // Determine institution type
    const institutionType = updatedTeam.contingent.school ? "school" : "higherInstitution";
    
    // Format the response with simplified properties
    const formattedResponse = {
      id: updatedTeam.id,
      name: updatedTeam.name,
      hashcode: updatedTeam.hashcode,
      description: updatedTeam.description,
      status: updatedTeam.status,
      contestId: updatedTeam.contestId,
      contestName: updatedTeam.contest.name,
      contestMaxMembers: updatedTeam.contest.maxMembersPerTeam,
      contingentId: updatedTeam.contingentId,
      contingentName: updatedTeam.contingent.name,
      institutionName: institutionName,
      institutionType: institutionType,
      maxMembers: updatedTeam.maxMembers,
      isOwner: isOwner,
      isManager: isUserTeamManager || isUserContingentManager,
      minAge: updatedTeam.contest.minAge,
      maxAge: updatedTeam.contest.maxAge,
      createdAt: updatedTeam.createdAt,
      updatedAt: updatedTeam.updatedAt,
      members: formattedMembers
    };
    
    return NextResponse.json(formattedResponse, { status: 200 });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Failed to remove contestant from team" },
      { status: 500 }
    );
  }
}
