import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// GET /api/contests - Get all contests
export async function GET(req: NextRequest) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      
      // Check authentication
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Parse query parameters
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get("search") || "";
    const contestType = url.searchParams.get("contestType") || undefined;
    const status = url.searchParams.get("status");

    // Determine date filters based on status
    const now = new Date();
    let dateFilter = {};
    
    if (status === "active") {
      dateFilter = {
        startDate: { lte: now },
        endDate: { gte: now }
      };
    } else if (status === "upcoming") {
      dateFilter = {
        startDate: { gt: now }
      };
    } else if (status === "completed") {
      dateFilter = {
        endDate: { lt: now }
      };
    }

    // Build the filter
    const filter: any = {
      OR: [
        { name: { contains: searchQuery, mode: "insensitive" } },
        { code: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } }
      ],
      ...dateFilter
    };

    // Add contest type filter if provided
    if (contestType) {
      filter.contestType = contestType;
    }

    // Fetch contests with counts
    const contests = await prisma.contest.findMany({
      where: filter,
      include: {
        _count: {
          select: {
            submissions: true,
            contingents: true
          }
        },
        targetGroup: true,
        theme: true
      },
      orderBy: {
        startDate: "desc"
      }
    });

    return NextResponse.json(contests);
  } catch (error) {
    console.error("Error fetching contests:", error);
    return NextResponse.json(
      { error: "Failed to fetch contests" },
      { status: 500 }
    );
  }
}

// POST /api/contests - Create a new contest
export async function POST(req: NextRequest) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      
      // Check authentication
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      // Check authorization (only ADMIN and OPERATOR can create contests)
      if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR'])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const data = await req.json();
    console.log("Received contest creation data:", data);
    
    // Validate required fields
    const requiredFields = [
      "name", "code", "contestType", "method", 
      "judgingMethod", "startDate", "endDate"
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Parse dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Validate date range
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Prepare contest data
    const contestData: any = {
      name: data.name,
      code: data.code,
      description: data.description,
      contestType: data.contestType,
      method: data.method,
      judgingMethod: data.judgingMethod,
      accessibility: data.accessibility || false,
      startDate,
      endDate
    };

    // Add themeId if provided
    if (data.themeId !== undefined) {
      if (data.themeId !== null) {
        contestData.themeId = typeof data.themeId === 'string' 
          ? parseInt(data.themeId) 
          : data.themeId;
      }
    }

    // Add target groups if provided
    if (data.targetGroupIds && Array.isArray(data.targetGroupIds) && data.targetGroupIds.length > 0) {
      contestData.targetGroup = {
        connect: data.targetGroupIds.map((id: number | string) => ({ 
          id: typeof id === 'string' ? parseInt(id) : id 
        }))
      };
    }

    // Create the contest
    const contest = await prisma.contest.create({
      data: contestData,
      include: {
        targetGroup: true,
        theme: true
      }
    });

    return NextResponse.json(contest, { status: 201 });
  } catch (error: any) {
    console.error("Error creating contest:", error);
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A contest with this code already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create contest" },
      { status: 500 }
    );
  }
}
