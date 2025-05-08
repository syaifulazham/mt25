import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for creating a new team
const createTeamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  contestId: z.number({
    required_error: "Contest is required",
    invalid_type_error: "Contest ID must be a number"
  }),
  contingentId: z.number({
    required_error: "Contingent is required",
    invalid_type_error: "Contingent ID must be a number"
  }),
  participantId: z.number({
    required_error: "Participant ID is required",
    invalid_type_error: "Participant ID must be a number"
  }),
  maxMembers: z.number().min(1).max(10).default(4)
});

// GET handler - Get participant's teams
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get participant ID from query params
    const searchParams = request.nextUrl.searchParams;
    const participantIdParam = searchParams.get("participantId");
    
    if (!participantIdParam) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 });
    }
    
    const participantId = parseInt(participantIdParam);
    
    // Get teams where the participant is a manager
    const teamsAsManager = await prisma.team.findMany({
      where: {
        managers: {
          some: {
            participantId: participantId
          }
        }
      },
      include: {
        contest: {
          select: {
            name: true,
            code: true,
            maxMembersPerTeam: true
          }
        },
        contingent: {
          select: {
            name: true
          }
        },
        members: {
          select: {
            id: true
          }
        },
        managers: {
          where: {
            participantId: participantId
          },
          select: {
            isOwner: true
          }
        }
      }
    });
    
    // Format the teams for the response
    const formattedTeams = teamsAsManager.map(team => ({
      id: team.id,
      name: team.name,
      hashcode: team.hashcode,
      description: team.description,
      status: team.status,
      contestId: team.contestId,
      contestName: team.contest.name,
      contestCode: team.contest.code,
      contingentId: team.contingentId,
      contingentName: team.contingent.name,
      memberCount: team.members.length,
      maxMembers: team.maxMembers,
      contestMaxMembers: team.contest.maxMembersPerTeam || team.maxMembers,
      isOwner: team.managers.length > 0 ? team.managers[0].isOwner : false,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    }));
    
    return NextResponse.json(formattedTeams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

// POST handler - Create a new team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const json = await request.json();
    
    // Validate the request body
    const validationResult = createTeamSchema.safeParse(json);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, description, contestId, contingentId, participantId, maxMembers } = validationResult.data;
    
    // Verify the participant exists
    const participant = await prisma.user_participant.findUnique({
      where: { id: participantId }
    });
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Verify the participant is a manager of the contingent
    const isContingentManager = await prisma.contingentManager.findFirst({
      where: {
        participantId: participantId,
        contingentId: contingentId
      }
    });
    
    // Also check for legacy contingent management (directly managed)
    const legacyContingent = await prisma.contingent.findFirst({
      where: {
        id: contingentId,
        participantId: participantId,
        managedByParticipant: true
      }
    });
    
    if (!isContingentManager && !legacyContingent) {
      return NextResponse.json(
        { error: "You must be a manager of the contingent to create a team for it" },
        { status: 403 }
      );
    }
    
    // Verify the contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: contestId }
    });
    
    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }
    
    // Generate a unique hashcode for the team
    // Format: first 3 letters of team name + first 3 letters of contest code + random 4 digits
    const namePrefix = name.substring(0, 3).toUpperCase();
    const contestPrefix = contest.code.substring(0, 3).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    const hashcode = `${namePrefix}${contestPrefix}${randomDigits}`;
    
    // Create the team
    const newTeam = await prisma.team.create({
      data: {
        name,
        description,
        hashcode,
        contestId,
        contingentId,
        maxMembers,
        status: "ACTIVE",
        // Create the manager relationship at the same time
        managers: {
          create: [
            {
              participantId,
              isOwner: true
            }
          ]
        }
      }
    });
    
    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error("Error creating team:", error);
    
    // Handle unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: "A team with this name or hashcode already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}
