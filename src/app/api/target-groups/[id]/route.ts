import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Schema for updating target groups
const updateTargetGroupSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  ageGroup: z.string().min(1, "Age group is required"),
  minAge: z.number().int().min(0, "Minimum age must be 0 or greater"),
  maxAge: z.number().int().min(0, "Maximum age must be 0 or greater"),
  schoolLevel: z.string().min(1, "School level is required"),
});

// GET /api/target-groups/[id] - Get a specific target group
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

    // Get target group from database
    const targetGroup = await prisma.targetGroup.findUnique({
      where: { id },
      include: {
        contests: true,
        _count: {
          select: { contests: true }
        }
      }
    });

    if (!targetGroup) {
      return NextResponse.json({ error: "Target group not found" }, { status: 404 });
    }

    return NextResponse.json(targetGroup);
  } catch (error) {
    console.error("Error fetching target group:", error);
    return NextResponse.json(
      { error: "Failed to fetch target group" },
      { status: 500 }
    );
  }
}

// PATCH /api/target-groups/[id] - Update a target group
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

    // Only ADMIN and OPERATOR can update target groups
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if target group exists
    const existingTargetGroup = await prisma.targetGroup.findUnique({
      where: { id },
    });

    if (!existingTargetGroup) {
      return NextResponse.json({ error: "Target group not found" }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const validationResult = updateTargetGroupSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Update target group in database
    const updatedTargetGroup = await prisma.targetGroup.update({
      where: { id },
      data: {
        code: validationResult.data.code,
        name: validationResult.data.name,
        ageGroup: validationResult.data.ageGroup,
        minAge: validationResult.data.minAge,
        maxAge: validationResult.data.maxAge,
        schoolLevel: validationResult.data.schoolLevel,
      },
    });

    return NextResponse.json(updatedTargetGroup);
  } catch (error: any) {
    console.error("Error updating target group:", error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A target group with this code already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update target group" },
      { status: 500 }
    );
  }
}

// DELETE /api/target-groups/[id] - Delete a target group
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

    // Only ADMIN and OPERATOR can delete target groups
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if target group exists
    const existingTargetGroup = await prisma.targetGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { contests: true }
        }
      }
    });

    if (!existingTargetGroup) {
      return NextResponse.json({ error: "Target group not found" }, { status: 404 });
    }

    // Check if target group has related contests
    if (existingTargetGroup._count.contests > 0) {
      return NextResponse.json(
        { error: "Cannot delete target group with related contests. Remove the contests first." },
        { status: 400 }
      );
    }

    // Delete target group from database
    await prisma.targetGroup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting target group:", error);
    return NextResponse.json(
      { error: "Failed to delete target group" },
      { status: 500 }
    );
  }
}
