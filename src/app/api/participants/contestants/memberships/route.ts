import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { prismaExecute } from "@/lib/prisma";

// POST handler - Get team memberships for multiple contestants
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { contestantIds } = body;
    
    if (!contestantIds || !Array.isArray(contestantIds)) {
      return NextResponse.json({ error: "contestantIds array is required" }, { status: 400 });
    }
    
    // Find the participant by email
    const participant = await prismaExecute(prisma => prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    }));
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Get team memberships for the provided contestant IDs
    const teamMemberships = await prismaExecute(prisma => prisma.teamMember.findMany({
      where: {
        contestantId: { in: contestantIds }
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    }));
    
    return NextResponse.json(teamMemberships);
  } catch (error) {
    console.error("Error fetching team memberships:", error);
    return NextResponse.json(
      { error: "Failed to fetch team memberships" },
      { status: 500 }
    );
  }
}
