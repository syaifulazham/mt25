import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Schema for updating zones
const updateZoneSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

// GET /api/zones/[id] - Get a specific zone
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

    // Get zone from database
    const zone = await prisma.zone.findUnique({
      where: { id },
      include: {
        states: true,
        _count: {
          select: { states: true }
        }
      }
    });

    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json(zone);
  } catch (error) {
    console.error("Error fetching zone:", error);
    return NextResponse.json(
      { error: "Failed to fetch zone" },
      { status: 500 }
    );
  }
}

// PATCH /api/zones/[id] - Update a zone
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

    // Only ADMIN and OPERATOR can update zones
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if zone exists
    const existingZone = await prisma.zone.findUnique({
      where: { id },
    });

    if (!existingZone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const validationResult = updateZoneSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Update zone in database
    const updatedZone = await prisma.zone.update({
      where: { id },
      data: {
        name: validationResult.data.name,
      },
    });

    return NextResponse.json(updatedZone);
  } catch (error: any) {
    console.error("Error updating zone:", error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A zone with this name already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update zone" },
      { status: 500 }
    );
  }
}

// DELETE /api/zones/[id] - Delete a zone
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

    // Only ADMIN and OPERATOR can delete zones
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if zone exists
    const existingZone = await prisma.zone.findUnique({
      where: { id },
      include: {
        _count: {
          select: { states: true }
        }
      }
    });

    if (!existingZone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    // Check if zone has related states
    if (existingZone._count.states > 0) {
      return NextResponse.json(
        { error: "Cannot delete zone with related states. Remove the states first." },
        { status: 400 }
      );
    }

    // Delete zone from database
    await prisma.zone.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting zone:", error);
    return NextResponse.json(
      { error: "Failed to delete zone" },
      { status: 500 }
    );
  }
}
