import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for updating a contingent request
const updateRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"])
});

// PATCH handler - Update a contingent request (approve/reject)
export async function PATCH(
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
    
    const body = await request.json();
    
    // Validate request body
    const validationResult = updateRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { status } = validationResult.data;
    
    // Get the contingent request
    const contingentRequest = await prisma.contingentRequest.findUnique({
      where: { id: requestId },
      include: {
        contingent: true
      }
    });
    
    if (!contingentRequest) {
      return NextResponse.json({ error: "Contingent request not found" }, { status: 404 });
    }
    
    // Check if the current participant is a manager of the contingent
    const contingent = contingentRequest.contingent;
    
    // Find the participant record for the current session user
    const participant = await prisma.user_participant.findFirst({
      where: { 
        email: session.user.email || '' // Ensure email is never null or undefined
      },
      select: { id: true }
    });
    
    if (!participant) {
      console.log(`Participant with email ${session.user.email} not found`);
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    const participantId = participant.id;
    console.log(`Checking if participant ${participantId} is a manager of contingent ${contingent.id}`);
    
    // Initialize manager status variables
    let managerRecord = null;
    let isLegacyManager = false;
    
    // Check if the participant is a manager
    try {
      // Check if the participant is a manager using the contingentManager model
      managerRecord = await prisma.contingentManager.findFirst({
        where: {
          contingentId: contingent.id,
          participantId: participantId
        }
      });
      
      console.log(`Manager record found: ${managerRecord !== null}`, managerRecord);
      
      // Also check the legacy relationship (direct participantId)
      isLegacyManager = contingent.managedByParticipant && contingent.participantId === participantId;
      console.log(`Is legacy manager: ${isLegacyManager}`);
    } catch (error) {
      console.error('Error checking manager status:', error);
    }
    
    // No need to check old schema as we're working exclusively with participantId
    
    // Determine final manager status
    const isManager = managerRecord !== null || isLegacyManager;
    console.log(`Final manager status: ${isManager}`);
    
    if (!isManager) {
      console.log(`Participant ${participantId} is not authorized to update request ${requestId}`);
      console.log(`Contingent data:`, JSON.stringify(contingent, null, 2));
      return NextResponse.json(
        { error: "You are not authorized to update this request" },
        { status: 403 }
      );
    }
    
    console.log(`Participant ${participantId} is authorized to update request ${requestId}`);
    
    // Update the request status
    const updatedRequest = await prisma.contingentRequest.update({
      where: { id: requestId },
      data: {
        status,
        updatedAt: new Date()
      }
    });
    
    // If approved, update the participant's association with the contingent
    if (status === "APPROVED") {
      try {
        // Get the participant details to confirm they exist and get their email
        const participantDetails = await prisma.user_participant.findUnique({
          where: { id: contingentRequest.participantId },
          select: { id: true, email: true }
        });
        
        if (!participantDetails) {
          console.error(`Participant with ID ${contingentRequest.participantId} not found`);
          return NextResponse.json({ error: "Participant not found" }, { status: 404 });
        }
        
        // Try to create the manager relationship using the new schema first
        try {
          // Add the participant as a contingent manager
          await prisma.contingentManager.create({
            data: {
              participantId: contingentRequest.participantId,
              contingentId: contingentRequest.contingentId,
              isOwner: false, // Co-manager, not the primary owner
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          console.log(`Participant ${contingentRequest.participantId} added as co-manager for contingent ${contingentRequest.contingentId}`);
        } catch (error) {
          console.error('Error adding participant as manager:', error);
          return NextResponse.json(
            { error: "Failed to add participant as manager" },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error("Error updating contingent-participant relationship:", error);
        return NextResponse.json(
          { error: "Failed to add participant to contingent" },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error updating contingent request:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Return more detailed error message if available
    const errorMessage = error instanceof Error ? error.message : "Failed to update contingent request";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
