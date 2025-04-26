import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

// GET handler - Get managers for a specific contingent
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const contingentId = parseInt(params.id);
    
    // Find the participant by email
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Check if the contingent exists
    const contingent = await prisma.contingent.findUnique({
      where: { id: contingentId }
    });
    
    if (!contingent) {
      return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
    }
    
    // Get all managers for this contingent
    const managers = await prisma.contingentManager.findMany({
      where: { contingentId },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { isOwner: 'desc' },  // Primary managers first
        { createdAt: 'asc' }  // Then by creation date
      ]
    });
    
    // Also check for legacy relationship (direct participantId in contingent)
    if (contingent.participantId && contingent.managedByParticipant) {
      // Check if this legacy manager is already in the managers list
      const legacyManagerExists = managers.some(
        manager => manager.participantId === contingent.participantId
      );
      
      // If not, fetch the participant details and add to the list
      if (!legacyManagerExists && contingent.participantId) {
        const legacyParticipant = await prisma.user_participant.findUnique({
          where: { id: contingent.participantId },
          select: {
            id: true,
            name: true,
            email: true
          }
        });
        
        if (legacyParticipant) {
          // Add the legacy manager to the beginning of the list
          managers.unshift({
            id: -1, // Use a placeholder ID
            participantId: legacyParticipant.id,
            contingentId,
            isOwner: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            participant: legacyParticipant
          });
        }
      }
    }
    
    return NextResponse.json({ managers });
  } catch (error) {
    console.error("Error fetching contingent managers:", error);
    return NextResponse.json(
      { error: "Failed to fetch contingent managers" },
      { status: 500 }
    );
  }
}

// POST handler - Add a new manager to the contingent
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const contingentId = parseInt(params.id);
    const body = await request.json();
    
    // Validate required fields
    if (!body.participantId) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }
    
    // Find the requesting participant by email
    const requestingParticipant = await prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!requestingParticipant) {
      return NextResponse.json({ error: "Requesting participant not found" }, { status: 404 });
    }
    
    // Check if the contingent exists
    const contingent = await prisma.contingent.findUnique({
      where: { id: contingentId }
    });
    
    if (!contingent) {
      return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
    }
    
    // Check if the requesting participant is a primary manager of this contingent
    const isManager = await prisma.contingentManager.findFirst({
      where: {
        participantId: requestingParticipant.id,
        contingentId,
        isOwner: true
      }
    });
    
    // Also check legacy relationship
    const hasAccess = isManager !== null || 
      (contingent.managedByParticipant && contingent.participantId === requestingParticipant.id);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Only primary managers can add new managers" },
        { status: 403 }
      );
    }
    
    // Check if the participant to be added exists
    const participantToAdd = await prisma.user_participant.findUnique({
      where: { id: parseInt(body.participantId) }
    });
    
    if (!participantToAdd) {
      return NextResponse.json({ error: "Participant to add not found" }, { status: 404 });
    }
    
    // Check if this participant is already a manager of this contingent
    const existingManager = await prisma.contingentManager.findFirst({
      where: {
        participantId: parseInt(body.participantId),
        contingentId
      }
    });
    
    if (existingManager) {
      return NextResponse.json(
        { error: "This participant is already a manager of this contingent" },
        { status: 400 }
      );
    }
    
    // Add the new manager
    const newManager = await prisma.contingentManager.create({
      data: {
        participantId: parseInt(body.participantId),
        contingentId,
        isOwner: body.isOwner === true // Default is false
      },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return NextResponse.json(newManager, { status: 201 });
  } catch (error) {
    console.error("Error adding contingent manager:", error);
    return NextResponse.json(
      { error: "Failed to add contingent manager" },
      { status: 500 }
    );
  }
}

// DELETE handler - Remove a manager from the contingent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const contingentId = parseInt(params.id);
    const searchParams = request.nextUrl.searchParams;
    const managerId = searchParams.get("managerId");
    
    if (!managerId) {
      return NextResponse.json({ error: "Manager ID is required" }, { status: 400 });
    }
    
    // Find the requesting participant by email
    const requestingParticipant = await prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!requestingParticipant) {
      return NextResponse.json({ error: "Requesting participant not found" }, { status: 404 });
    }
    
    // Check if the contingent exists
    const contingent = await prisma.contingent.findUnique({
      where: { id: contingentId }
    });
    
    if (!contingent) {
      return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
    }
    
    // Check if the requesting participant is a primary manager of this contingent
    const isManager = await prisma.contingentManager.findFirst({
      where: {
        participantId: requestingParticipant.id,
        contingentId,
        isOwner: true
      }
    });
    
    // Also check legacy relationship
    const hasAccess = isManager !== null || 
      (contingent.managedByParticipant && contingent.participantId === requestingParticipant.id);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Only primary managers can remove managers" },
        { status: 403 }
      );
    }
    
    // Check if the manager to be removed exists
    const managerToRemove = await prisma.contingentManager.findUnique({
      where: { id: parseInt(managerId) }
    });
    
    if (!managerToRemove) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }
    
    // Prevent removing the last primary manager
    if (managerToRemove.isOwner) {
      const primaryManagersCount = await prisma.contingentManager.count({
        where: {
          contingentId,
          isOwner: true
        }
      });
      
      if (primaryManagersCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last primary manager" },
          { status: 400 }
        );
      }
    }
    
    // Remove the manager
    await prisma.contingentManager.delete({
      where: { id: parseInt(managerId) }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing contingent manager:", error);
    return NextResponse.json(
      { error: "Failed to remove contingent manager" },
      { status: 500 }
    );
  }
}
