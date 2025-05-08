import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Force dynamic rendering - required for routes that use cookies
export const dynamic = 'force-dynamic';

// POST /api/participants/contingents/[id]/leave
// Allows a user to leave a contingent they are a member of, but prevents primary owners from leaving
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse contingent ID from params
    const contingentId = parseInt(params.id, 10);
    if (isNaN(contingentId)) {
      return NextResponse.json({ error: "Invalid contingent ID" }, { status: 400 });
    }

    // Get the participant record for the current user
    const participant = await prisma.user_participant.findFirst({
      where: {
        email: session.user.email
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    // Check if the contingent exists
    const contingent = await prisma.contingent.findUnique({
      where: { id: contingentId },
      include: {
        managers: {
          where: {
            participantId: participant.id
          }
        }
      }
    });

    if (!contingent) {
      return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
    }

    // Check if the user is a manager of this contingent
    if (contingent.managers.length === 0) {
      return NextResponse.json({ error: "You are not a member of this contingent" }, { status: 403 });
    }

    // Check if the user is the primary owner (isOwner = true)
    const managerRecord = contingent.managers[0];
    if (managerRecord.isOwner) {
      return NextResponse.json({ 
        error: "Primary contingent owners cannot leave. Transfer ownership to another manager first."
      }, { status: 403 });
    }

    // All checks passed, remove the user from the contingent
    await prisma.contingentManager.delete({
      where: {
        id: managerRecord.id
      }
    });

    // Return success response
    return NextResponse.json({ 
      message: "Successfully left the contingent",
      contingentId 
    });
  } catch (error) {
    console.error("Error leaving contingent:", error);
    return NextResponse.json({ error: "Failed to leave contingent" }, { status: 500 });
  }
}
