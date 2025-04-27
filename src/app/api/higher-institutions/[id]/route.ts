import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Mark this route as dynamic since it uses getCurrentUser() which uses headers()
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Schema for updating higher institutions
const updateHigherInstitutionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  stateId: z.number().int().positive("State ID is required"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

// GET /api/higher-institutions/[id] - Get a specific higher institution
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

    // Get higher institution from database
    const higherInstitution = await prisma.higherinstitution.findUnique({
      where: { id },
      include: {
        state: {
          include: {
            zone: true
          }
        }
      }
    });

    if (!higherInstitution) {
      return NextResponse.json({ error: "Higher institution not found" }, { status: 404 });
    }

    return NextResponse.json(higherInstitution);
  } catch (error) {
    console.error("Error fetching higher institution:", error);
    return NextResponse.json(
      { error: "Failed to fetch higher institution" },
      { status: 500 }
    );
  }
}

// PATCH /api/higher-institutions/[id] - Update a higher institution
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

    // Only ADMIN and OPERATOR can update higher institutions
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if higher institution exists
    const existingHigherInstitution = await prisma.higherinstitution.findUnique({
      where: { id },
    });

    if (!existingHigherInstitution) {
      return NextResponse.json({ error: "Higher institution not found" }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const validationResult = updateHigherInstitutionSchema.safeParse(body);
    
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

    // Update higher institution in database
    const updatedHigherInstitution = await prisma.higherinstitution.update({
      where: { id },
      data: {
        name: validationResult.data.name,
        code: validationResult.data.code,
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

    return NextResponse.json(updatedHigherInstitution);
  } catch (error: any) {
    console.error("Error updating higher institution:", error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A higher institution with this code already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update higher institution" },
      { status: 500 }
    );
  }
}

// DELETE /api/higher-institutions/[id] - Delete a higher institution
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

    // Only ADMIN and OPERATOR can delete higher institutions
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if higher institution exists
    const existingHigherInstitution = await prisma.higherinstitution.findUnique({
      where: { id },
    });

    if (!existingHigherInstitution) {
      return NextResponse.json({ error: "Higher institution not found" }, { status: 404 });
    }

    // Delete higher institution from database
    await prisma.higherinstitution.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting higher institution:", error);
    return NextResponse.json(
      { error: "Failed to delete higher institution" },
      { status: 500 }
    );
  }
}
