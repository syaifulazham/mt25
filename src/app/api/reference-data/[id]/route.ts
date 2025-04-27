import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Mark this route as dynamic since it uses getCurrentUser() which uses headers()
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Schema for updating reference data
const updateReferenceDataSchema = z.object({
  type: z.string().min(1, "Type is required").optional(),
  code: z.string().min(1, "Code is required").optional(),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /api/reference-data/[id] - Get a specific reference data item
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

    // Get reference data from database
    const referenceData = await prisma.referencedata.findUnique({
      where: { id },
    });

    if (!referenceData) {
      return NextResponse.json({ error: "Reference data not found" }, { status: 404 });
    }

    return NextResponse.json(referenceData);
  } catch (error) {
    console.error("Error fetching reference data:", error);
    return NextResponse.json(
      { error: "Failed to fetch reference data" },
      { status: 500 }
    );
  }
}

// PATCH /api/reference-data/[id] - Update a reference data item
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

    // Only ADMIN and OPERATOR can update reference data
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if reference data exists
    const existingReferenceData = await prisma.referencedata.findUnique({
      where: { id },
    });

    if (!existingReferenceData) {
      return NextResponse.json({ error: "Reference data not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateReferenceDataSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // If type or code is changed, check for duplicates
    if ((data.type && data.type !== existingReferenceData.type) || 
        (data.code && data.code !== existingReferenceData.code)) {
      const duplicate = await prisma.referencedata.findFirst({
        where: {
          type: data.type || existingReferenceData.type,
          code: data.code || existingReferenceData.code,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Reference data with this type and code already exists" },
          { status: 409 }
        );
      }
    }

    // Update reference data in database
    const updatedReferenceData = await prisma.referencedata.update({
      where: { id },
      data,
    });

    return NextResponse.json(updatedReferenceData);
  } catch (error) {
    console.error("Error updating reference data:", error);
    return NextResponse.json(
      { error: "Failed to update reference data" },
      { status: 500 }
    );
  }
}

// DELETE /api/reference-data/[id] - Delete a reference data item
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

    // Only ADMIN can delete reference data
    if (!hasRequiredRole(currentUser, ["ADMIN"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if reference data exists
    const existingReferenceData = await prisma.referencedata.findUnique({
      where: { id },
    });

    if (!existingReferenceData) {
      return NextResponse.json({ error: "Reference data not found" }, { status: 404 });
    }

    // Check if reference data is in use
    // This would depend on your data model - you may need to add checks for foreign key references

    // Delete reference data from database
    await prisma.referencedata.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reference data:", error);
    return NextResponse.json(
      { error: "Failed to delete reference data" },
      { status: 500 }
    );
  }
}
