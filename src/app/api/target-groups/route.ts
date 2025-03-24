import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Schema for creating/updating target groups
const targetGroupSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  ageGroup: z.string().min(1, "Age group is required"),
  minAge: z.number().int().min(0, "Minimum age must be 0 or greater"),
  maxAge: z.number().int().min(0, "Maximum age must be 0 or greater"),
  schoolLevel: z.string().min(1, "School level is required"),
});

// GET /api/target-groups - Get all target groups
export async function GET(request: NextRequest) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      // Check authentication
      const user = await getCurrentUser();
      
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    
    // Parse pagination parameters
    const page = pageParam ? parseInt(pageParam) : 1;
    const pageSize = pageSizeParam ? parseInt(pageSizeParam) : 10;
    const skip = (page - 1) * pageSize;
    
    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { ageGroup: { contains: search } },
        { schoolLevel: { contains: search } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.targetgroup.count({ where });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Get target groups from database with pagination
    const targetGroups = await prisma.targetgroup.findMany({
      where,
      orderBy: { name: "asc" },
      skip: skip,
      take: pageSize,
      include: {
        _count: {
          select: { contest: true }
        }
      }
    });

    // Return paginated response
    return NextResponse.json({
      data: targetGroups,
      meta: {
        currentPage: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPreviousPage: hasPreviousPage
      }
    });
  } catch (error) {
    console.error("Error fetching target groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch target groups" },
      { status: 500 }
    );
  }
}

// POST /api/target-groups - Create a new target group
export async function POST(request: NextRequest) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      // Check authentication and authorization
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Only ADMIN and OPERATOR can create target groups
      if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Validate request body
    const body = await request.json();
    console.log("Received target group data:", body);
    
    // Handle potential string values for numeric fields
    const processedBody = {
      ...body,
      minAge: typeof body.minAge === 'string' ? parseInt(body.minAge) : body.minAge,
      maxAge: typeof body.maxAge === 'string' ? parseInt(body.maxAge) : body.maxAge,
    };
    
    const validationResult = targetGroupSchema.safeParse(processedBody);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.format());
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Create target group in database
    const targetGroup = await prisma.targetgroup.create({
      data: {
        code: validationResult.data.code,
        name: validationResult.data.name,
        ageGroup: validationResult.data.ageGroup,
        minAge: validationResult.data.minAge,
        maxAge: validationResult.data.maxAge,
        schoolLevel: validationResult.data.schoolLevel,
      },
    });

    return NextResponse.json(targetGroup, { status: 201 });
  } catch (error: any) {
    console.error("Error creating target group:", error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A target group with this code already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create target group" },
      { status: 500 }
    );
  }
}
