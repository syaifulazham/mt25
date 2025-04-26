import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Schema for updating states
const updateStateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  zoneId: z.number().int().positive("Zone ID is required"),
});

// GET /api/states/[id] - Get a specific state
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Get state from database
    const state = await prisma.state.findUnique({
      where: { id },
      include: {
        zone: true,
        school: true,
        higherinstitution: true,
      }
    });

    if (!state) {
      return NextResponse.json({ error: "State not found" }, { status: 404 });
    }

    return NextResponse.json(state);
  } catch (error) {
    console.error("Error fetching state:", error);
    return NextResponse.json(
      { error: "Failed to fetch state" },
      { status: 500 }
    );
  }
}

// PATCH /api/states/[id] - Update a state
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and OPERATOR can update states
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if state exists
    const existingState = await prisma.state.findUnique({
      where: { id },
    });

    if (!existingState) {
      return NextResponse.json({ error: "State not found" }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const validationResult = updateStateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Check if zone exists
    const zone = await prisma.zone.findUnique({
      where: { id: validationResult.data.zoneId },
    });

    if (!zone) {
      return NextResponse.json(
        { error: "Zone not found" },
        { status: 400 }
      );
    }

    // Update state in database
    const updatedState = await prisma.state.update({
      where: { id },
      data: {
        name: validationResult.data.name,
        zoneId: validationResult.data.zoneId,
      },
      include: {
        zone: true,
      },
    });

    return NextResponse.json(updatedState);
  } catch (error: any) {
    console.error("Error updating state:", error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A state with this name already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update state" },
      { status: 500 }
    );
  }
}

// DELETE /api/states/[id] - Delete a state
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and OPERATOR can delete states
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if state exists
    const existingState = await prisma.state.findUnique({
      where: { id },
      include: {
        _count: {
          select: { 
            school: true,
            higherinstitution: true
          }
        }
      }
    });

    if (!existingState) {
      return NextResponse.json({ error: "State not found" }, { status: 404 });
    }

    // Check if state has related schools or higher institutions
    if (existingState._count.school > 0 || existingState._count.higherinstitution > 0) {
      return NextResponse.json(
        { error: "Cannot delete state with related schools or higher institutions. Remove them first." },
        { status: 400 }
      );
    }

    // Delete state from database
    await prisma.state.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting state:", error);
    return NextResponse.json(
      { error: "Failed to delete state" },
      { status: 500 }
    );
  }
}
