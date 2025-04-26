import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Schema for creating/updating higher institutions
const higherInstitutionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  stateId: z.number().int().positive("State ID is required"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

// GET /api/higher-institutions - Get all higher institutions
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const stateId = searchParams.get("stateId");
    
    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { city: { contains: search } },
      ];
    }
    
    if (stateId) {
      where.stateId = parseInt(stateId);
    }

    // Get higher institutions from database
    const higherInstitutions = await prisma.higherinstitution.findMany({
      where,
      include: {
        state: {
          include: {
            zone: true
          }
        }
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(higherInstitutions);
  } catch (error) {
    console.error("Error fetching higher institutions:", error);
    return NextResponse.json(
      { error: "Failed to fetch higher institutions" },
      { status: 500 }
    );
  }
}

// POST /api/higher-institutions - Create a new higher institution
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and OPERATOR can create higher institutions
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const validationResult = higherInstitutionSchema.safeParse(body);
    
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

    // Create higher institution in database
    const higherInstitution = await prisma.higherinstitution.create({
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

    return NextResponse.json(higherInstitution, { status: 201 });
  } catch (error: any) {
    console.error("Error creating higher institution:", error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A higher institution with this code already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create higher institution" },
      { status: 500 }
    );
  }
}
