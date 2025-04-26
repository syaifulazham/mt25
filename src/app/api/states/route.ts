import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Schema for creating/updating states
const stateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  zoneId: z.number().int().positive("Zone ID is required"),
});

// GET /api/states - Get all states
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
    const zoneId = searchParams.get("zoneId");
    
    // Build where clause
    const where: any = {};
    
    if (search) {
      where.name = {
        contains: search,
      };
    }
    
    if (zoneId) {
      where.zoneId = parseInt(zoneId);
    }

    // Get states from database
    const states = await prisma.state.findMany({
      where,
      include: {
        zone: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(states);
  } catch (error) {
    console.error("Error fetching states:", error);
    return NextResponse.json(
      { error: "Failed to fetch states" },
      { status: 500 }
    );
  }
}

// POST /api/states - Create a new state
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and OPERATOR can create states
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const validationResult = stateSchema.safeParse(body);
    
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

    // Create state in database
    const state = await prisma.state.create({
      data: {
        name: validationResult.data.name,
        zoneId: validationResult.data.zoneId,
      },
      include: {
        zone: true,
      },
    });

    return NextResponse.json(state, { status: 201 });
  } catch (error: any) {
    console.error("Error creating state:", error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A state with this name already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create state" },
      { status: 500 }
    );
  }
}
