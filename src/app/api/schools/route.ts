import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Schema for creating/updating schools
const schoolSchema = z.object({
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

// GET /api/schools - Get all schools
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
    const level = searchParams.get("level");
    const category = searchParams.get("category");
    
    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { ppd: { contains: search } },
        { city: { contains: search } },
      ];
    }
    
    if (stateId) {
      where.stateId = parseInt(stateId);
    }
    
    if (level) {
      where.level = level;
    }
    
    if (category) {
      where.category = category;
    }

    // Get schools from database
    const schools = await prisma.school.findMany({
      where,
      include: {
        state: {
          include: {
            zone: true
          }
        },
        _count: {
          select: { contingent: true }
        }
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error("Error fetching schools:", error);
    return NextResponse.json(
      { error: "Failed to fetch schools" },
      { status: 500 }
    );
  }
}

// POST /api/schools - Create a new school
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and OPERATOR can create schools
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const validationResult = schoolSchema.safeParse(body);
    
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

    // Create school in database
    const school = await prisma.school.create({
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

    return NextResponse.json(school, { status: 201 });
  } catch (error: any) {
    console.error("Error creating school:", error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A school with this code already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create school" },
      { status: 500 }
    );
  }
}
