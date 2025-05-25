import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0; // Disable all caching

export async function DELETE(request: NextRequest) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get requestId from query parameters
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    // Find the request to validate it belongs to the current user
    const contingentRequest = await prisma.contingentRequest.findUnique({
      where: {
        id: parseInt(requestId)
      }
    });

    if (!contingentRequest) {
      return NextResponse.json({ error: "Contingent request not found" }, { status: 404 });
    }

    // Verify the session user owns this request by checking the participant
    const participant = await prisma.user_participant.findFirst({
      where: { 
        email: session.user.email || '' // Ensure email is never null or undefined
      },
      select: { id: true }
    });

    if (!participant || contingentRequest.participantId !== participant.id) {
      return NextResponse.json({ error: "Unauthorized to cancel this request" }, { status: 403 });
    }

    // Delete the contingent request
    await prisma.contingentRequest.delete({
      where: {
        id: parseInt(requestId)
      }
    });

    return NextResponse.json({ 
      success: true,
      message: "Contingent request cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling contingent request:", error);
    return NextResponse.json({ error: "Failed to cancel contingent request" }, { status: 500 });
  }
}
