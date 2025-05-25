import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0; // Disable all caching

export async function GET(request: NextRequest) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get participantId from query parameters
    const searchParams = request.nextUrl.searchParams;
    const participantId = searchParams.get("participantId");

    if (!participantId) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 });
    }

    // Find any pending join requests for this participant
    const pendingRequests = await prisma.contingentRequest.findFirst({
      where: {
        participantId: parseInt(participantId),
        status: "PENDING"
      },
      include: {
        contingent: {
          include: {
            school: true,
            higherInstitution: true,
            independent: true,
            managers: {
              include: {
                participant: true
              }
            }
          }
        }
      }
    });

    if (!pendingRequests) {
      return NextResponse.json({ 
        hasPendingRequest: false 
      });
    }

    // Format the response
    const primaryManager = pendingRequests.contingent.managers[0]?.participant;
    
    return NextResponse.json({
      hasPendingRequest: true,
      requestId: pendingRequests.id,
      contingentId: pendingRequests.contingentId,
      contingentName: pendingRequests.contingent.name,
      contingentType: pendingRequests.contingent.contingentType,
      institutionName: pendingRequests.contingent.school?.name || 
                       pendingRequests.contingent.higherInstitution?.name || 
                       pendingRequests.contingent.independent?.name || "",
      primaryManager: primaryManager ? {
        id: primaryManager.id,
        name: primaryManager.name,
        email: primaryManager.email,
        phoneNumber: primaryManager.phoneNumber
      } : null
    });
  } catch (error) {
    console.error("Error checking contingent requests:", error);
    return NextResponse.json({ error: "Failed to check contingent requests" }, { status: 500 });
  }
}
