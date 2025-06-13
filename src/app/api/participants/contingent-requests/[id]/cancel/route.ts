import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

// POST handler - Cancel a contingent request
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get request ID from params
    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }
    
    // Get the contingent request
    const contingentRequest = await prisma.contingentRequest.findUnique({
      where: { id: requestId }
    });
    
    if (!contingentRequest) {
      return NextResponse.json({ error: "Contingent request not found" }, { status: 404 });
    }
    
    // Find the participant record for the current session user
    const participant = await prisma.user_participant.findFirst({
      where: { 
        email: session.user.email || '' // Ensure email is never null or undefined
      },
      select: { id: true }
    });
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    const participantId = participant.id;
    
    // Check if the current user is the one who made the request
    // Only the participant who created the request can cancel it
    if (contingentRequest.participantId !== participantId) {
      return NextResponse.json(
        { error: "You are not authorized to cancel this request" },
        { status: 403 }
      );
    }
    
    // Cancel the request by updating its status
    const cancelledRequest = await prisma.contingentRequest.update({
      where: { id: requestId },
      data: {
        status: "CANCELLED",
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json(cancelledRequest);
  } catch (error) {
    console.error("Error cancelling contingent request:", error);
    
    // Return more detailed error message if available
    const errorMessage = error instanceof Error ? error.message : "Failed to cancel contingent request";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
