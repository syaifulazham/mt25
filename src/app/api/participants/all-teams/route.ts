import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

// GET handler - Get all teams for manager assignment
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // First, find the participant record for the current user
    const userParticipant = await prisma.user_participant.findUnique({
      where: {
        email: session.user.email ?? ''
      },
      select: {
        id: true
      }
    });
    
    if (!userParticipant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Find contingents where the user is the creator
    const createdContingents = await prisma.contingent.findMany({
      where: {
        participantId: userParticipant.id
      },
      select: {
        id: true
      }
    });
    
    // Find contingents where the user is a manager
    const managedContingents = await prisma.contingentManager.findMany({
      where: {
        participantId: userParticipant.id
      },
      select: {
        contingentId: true
      }
    });
    
    // Combine both sets of contingent IDs
    const contingentIds = [
      ...createdContingents.map(c => c.id),
      ...managedContingents.map(c => c.contingentId)
    ];
    
    // If no contingents found, return empty array
    if (contingentIds.length === 0) {
      return NextResponse.json([]);
    }
    
    // Get teams that belong to these contingents, sorted by name
    const teams = await prisma.team.findMany({
      where: {
        status: "ACTIVE",
        contingentId: {
          in: contingentIds
        }
      },
      select: {
        id: true,
        name: true,
        hashcode: true,
        contestId: true,
        contingentId: true,
        contingent: {
          select: {
            name: true
          }
        },
        contest: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: [
        {
          contest: {
            code: 'asc'
          }
        },
        {
          name: 'asc'
        }
      ]
    });
    
    // Format the teams for the response
    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      hashcode: team.hashcode,
      contestId: team.contestId,
      contestName: team.contest?.name,
      contestCode: team.contest?.code,
      contingentId: team.contingentId,
      contingentName: team.contingent?.name
    }));
    
    return NextResponse.json(formattedTeams);
  } catch (error) {
    console.error("Error fetching all teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
