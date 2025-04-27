import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Mark this route as dynamic since it uses getCurrentUser() which uses headers()
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Schema for updating schools
const updateSchoolSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  level: z.string().min(1, "Level is required"),
  category: z.string().min(1, "Category is required"),
  ppd: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  stateId: z.number().int().positive("State ID is required"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

// GET /api/schools/[id] - Get a specific school
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

    // Get school from database
    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        state: {
          include: {
            zone: true
          }
        },
        contingent: true,
      }
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json(school);
  } catch (error) {
    console.error("Error fetching school:", error);
    return NextResponse.json(
      { error: "Failed to fetch school" },
      { status: 500 }
    );
  }
}

// PATCH /api/schools/[id] - Update a school
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

    // Only ADMIN and OPERATOR can update schools
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if school exists
    const existingSchool = await prisma.school.findUnique({
      where: { id },
    });

    if (!existingSchool) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const validationResult = updateSchoolSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Check if state exists
    const state = await prisma.state.findUnique({
      where: { id: validationResult.data.stateId },
    });

    if (!state) {
      return NextResponse.json(
        { error: "State not found" },
        { status: 400 }
      );
    }

    // Update school in database
    const updatedSchool = await prisma.school.update({
      where: { id },
      data: {
        name: validationResult.data.name,
        code: validationResult.data.code,
        level: validationResult.data.level,
        category: validationResult.data.category,
        ppd: validationResult.data.ppd,
        address: validationResult.data.address,
        city: validationResult.data.city,
        postcode: validationResult.data.postcode,
        stateId: validationResult.data.stateId,
        latitude: validationResult.data.latitude,
        longitude: validationResult.data.longitude,
      },
      include: {
        state: true,
      },
    });

    return NextResponse.json(updatedSchool);
  } catch (error: any) {
    console.error("Error updating school:", error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A school with this code already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update school" },
      { status: 500 }
    );
  }
}

// DELETE /api/schools/[id] - Delete a school
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

    // Only ADMIN and OPERATOR can delete schools
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if school exists
    const existingSchool = await prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: { contingent: true }
        }
      }
    });

    if (!existingSchool) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Check if school has related contingents
    if (existingSchool._count.contingent > 0) {
      return NextResponse.json(
        { error: "Cannot delete school with related contingents. Remove the contingents first." },
        { status: 400 }
      );
    }

    // Delete school from database
    await prisma.school.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting school:", error);
    return NextResponse.json(
      { error: "Failed to delete school" },
      { status: 500 }
    );
  }
}
