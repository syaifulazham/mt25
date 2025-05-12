import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

// GET handler - Check if user has any managed contingents
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the participant by email
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Check for contingents managed through the contingentManager table
    const managedContingents = await prisma.contingentManager.findMany({
      where: {
        participantId: participant.id
      },
      include: {
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
        }
      }
    });
    
    // Also check legacy relationship in the contingent table
    const legacyContingents = await prisma.contingent.findMany({
      where: {
        managedByParticipant: true,
        participantId: participant.id
      },
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
    });
    
    // Combine both types of managed contingents
    const allContingents = [
      ...managedContingents.map(c => c.contingent),
      ...legacyContingents
    ];
    
    return NextResponse.json(allContingents);
  } catch (error) {
    console.error("Error fetching managed contingents:", error);
    return NextResponse.json(
      { error: "Failed to fetch managed contingents" },
      { status: 500 }
    );
  }
}
