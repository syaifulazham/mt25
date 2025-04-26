import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Schema for creating/updating reference data
const referenceDataSchema = z.object({
  type: z.string().min(1, "Type is required"),
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
});

// GET /api/reference-data - Get all reference data
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    // Build filter conditions
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get reference data from database
    const referenceData = await prisma.referencedata.findMany({
      where,
      orderBy: [
        { type: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(referenceData);
  } catch (error) {
    console.error("Error fetching reference data:", error);
    return NextResponse.json(
      { error: "Failed to fetch reference data" },
      { status: 500 }
    );
  }
}

// POST /api/reference-data - Create a new reference data item
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and OPERATOR can create reference data
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = referenceDataSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if reference data with same type and code already exists
    const existingData = await prisma.referencedata.findFirst({
      where: {
        type: data.type,
        code: data.code,
      },
    });

    if (existingData) {
      return NextResponse.json(
        { error: "Reference data with this type and code already exists" },
        { status: 409 }
      );
    }

    // Create reference data in database
    const referenceData = await prisma.referencedata.create({
      data: {
        ...data,
        updatedAt: new Date()
      },
    });

    return NextResponse.json(referenceData, { status: 201 });
  } catch (error) {
    console.error("Error creating reference data:", error);
    return NextResponse.json(
      { error: "Failed to create reference data" },
      { status: 500 }
    );
  }
}
