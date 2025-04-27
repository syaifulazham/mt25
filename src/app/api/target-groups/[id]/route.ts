import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Mark this route as dynamic since it uses getCurrentUser() which uses headers()
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

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
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      // Check authentication
      const user = await getCurrentUser();
      
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Get target group from database
    const targetGroup = await prisma.targetgroup.findUnique({
      where: { id },
      include: {
        contest: true,
        _count: {
          select: { contest: true }
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

// PUT /api/target-groups/[id] - Update a target group (alias for PATCH)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateTargetGroup(request, params);
}

// PATCH /api/target-groups/[id] - Update a target group
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateTargetGroup(request, params);
}

// Shared function for PUT and PATCH
async function updateTargetGroup(
  request: NextRequest,
  params: { id: string }
) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      // Check authentication and authorization
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Only ADMIN and OPERATOR can update target groups
      if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if target group exists
    const existingTargetGroup = await prisma.targetgroup.findUnique({
      where: { id },
    });

    if (!existingTargetGroup) {
      return NextResponse.json({ error: "Target group not found" }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    console.log("Received update data:", body);
    
    // Handle potential string values for numeric fields
    const processedBody = {
      ...body,
      minAge: typeof body.minAge === 'string' ? parseInt(body.minAge) : body.minAge,
      maxAge: typeof body.maxAge === 'string' ? parseInt(body.maxAge) : body.maxAge,
    };
    
    const validationResult = updateTargetGroupSchema.safeParse(processedBody);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.format());
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Update target group in database
    const updatedTargetGroup = await prisma.targetgroup.update({
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
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      // Check authentication and authorization
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Only ADMIN and OPERATOR can delete target groups
      if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if target group exists
    const existingTargetGroup = await prisma.targetgroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { contest: true }
        }
      }
    });

    if (!existingTargetGroup) {
      return NextResponse.json({ error: "Target group not found" }, { status: 404 });
    }

    // Check if target group has related contests
    if (existingTargetGroup._count.contest > 0) {
      return NextResponse.json(
        { error: "Cannot delete target group with related contests. Remove the contests first." },
        { status: 400 }
      );
    }

    // Delete target group from database
    await prisma.targetgroup.delete({
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
