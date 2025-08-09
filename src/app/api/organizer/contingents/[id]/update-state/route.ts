import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { prismaExecute } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the session using Next Auth
    const session = await getServerSession(authOptions);
    
    // If not authenticated, return 401
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const currentUser = session.user;
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Only admins can update contingent state" },
        { status: 403 }
      );
    }

    const contingentId = parseInt(params.id);
    if (isNaN(contingentId)) {
      return NextResponse.json(
        { error: "Invalid contingent ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { stateId } = body;

    if (!stateId || isNaN(parseInt(stateId))) {
      return NextResponse.json(
        { error: "Valid state ID is required" },
        { status: 400 }
      );
    }

    // First, verify the contingent exists and is of type INDEPENDENT
    const contingent = await prismaExecute(prisma => 
      prisma.contingent.findUnique({
        where: { id: contingentId },
        select: {
          id: true,
          contingentType: true,
          independentId: true
        }
      })
    );

    if (!contingent) {
      return NextResponse.json(
        { error: "Contingent not found" },
        { status: 404 }
      );
    }

    if (!contingent.independentId) {
      return NextResponse.json(
        { error: "Only contingents with independent data can have their state updated" },
        { status: 400 }
      );
    }

    if (!contingent.independentId) {
      return NextResponse.json(
        { error: "Contingent is not properly linked to independent record" },
        { status: 400 }
      );
    }

    // Verify the state exists
    const state = await prismaExecute(prisma => 
      prisma.state.findUnique({
        where: { id: parseInt(stateId) },
        select: { id: true, name: true }
      })
    );

    if (!state) {
      return NextResponse.json(
        { error: "State not found" },
        { status: 404 }
      );
    }

    // Update the state in the independent table
    const updatedIndependent = await prismaExecute(prisma => 
      prisma.independent.update({
        where: { id: contingent.independentId! }, // Use non-null assertion since we already checked
        data: {
          stateId: parseInt(stateId),
          updatedAt: new Date()
        },
        include: {
          state: {
            select: {
              id: true,
              name: true,
              zoneId: true
            }
          }
        }
      })
    );

    return NextResponse.json({
      success: true,
      message: `State updated to ${state.name}`,
      independent: updatedIndependent
    });

  } catch (error) {
    console.error("Error updating contingent state:", error);
    return NextResponse.json(
      { error: "Failed to update contingent state" },
      { status: 500 }
    );
  }
}
