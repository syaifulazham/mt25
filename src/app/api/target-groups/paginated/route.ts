import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prismaExecute } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/target-groups/paginated - Get paginated target groups
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    // Validate pagination parameters
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
    }

    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ error: "Invalid page size" }, { status: 400 });
    }

    // Build where clause for search
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { ageGroup: { contains: search } },
        { schoolLevel: { contains: search } },
      ];
    }

    // Calculate pagination values
    const skip = (page - 1) * pageSize;
    
    // Build orderBy
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get target groups from database with pagination
    const [targetGroups, totalCount] = await prismaExecute(async (prisma) => {
      return Promise.all([
        prisma.targetgroup.findMany({
          where,
          orderBy,
          skip,
          take: pageSize,
          include: {
            _count: {
              select: { contest: true }
            }
          }
        }),
        prisma.targetgroup.count({ where })
      ]);
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      data: targetGroups,
      meta: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    });
  } catch (error) {
    console.error("Error fetching paginated target groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch target groups" },
      { status: 500 }
    );
  }
}
