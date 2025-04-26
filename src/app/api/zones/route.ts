import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Schema for creating/updating zones
const zoneSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

// GET /api/zones - Get all zones
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
    
    // Build where clause
    const where: any = {};
    
    if (search) {
      where.name = {
        contains: search,
      };
    }

    // Get zones from database
    const zones = await prisma.zone.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { state: true }
        }
      }
    });

    return NextResponse.json(zones);
  } catch (error) {
    console.error("Error fetching zones:", error);
    return NextResponse.json(
      { error: "Failed to fetch zones" },
      { status: 500 }
    );
  }
}

// POST /api/zones - Create a new zone
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and OPERATOR can create zones
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const validationResult = zoneSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Create zone in database
    const zone = await prisma.zone.create({
      data: {
        name: validationResult.data.name,
      },
    });

    return NextResponse.json(zone, { status: 201 });
  } catch (error: any) {
    console.error("Error creating zone:", error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A zone with this name already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create zone" },
      { status: 500 }
    );
  }
}
