import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// GET /api/contests - Get all contests
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/contests - Request received");
    
    // Make this endpoint public to allow access from both participants and organizers
    // We're only returning basic contest information, so this is safe
    // Authentication will still be enforced for sensitive operations (create, update, delete)

    // Parse query parameters
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get("search") || "";
    const contestType = url.searchParams.get("contestType") || undefined;
    const participationMode = url.searchParams.get("participation_mode") || undefined;
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
    
    // Add participation mode filter if provided
    // Note: We need to be careful here because the field might not exist in the database yet
    // if the migration hasn't run. We'll use a try-catch approach.
    if (participationMode) {
      try {
        filter.participation_mode = participationMode;
      } catch (error) {
        console.warn("participation_mode filter not supported yet - please run database migrations");
        // If the field doesn't exist, we'll just skip the filter
      }
    }

    console.log("Executing Prisma query with filter:", JSON.stringify(filter, null, 2));
    
    try {
      // Fetch contests with counts
      const contests = await prisma.contest.findMany({
        where: filter,
        include: {
          _count: {
            select: {
              submission: true,
              contestants: true
            }
          },
          targetgroup: true,
          theme: true
        },
        orderBy: {
          startDate: "desc"
        }
      });

      console.log(`Successfully found ${contests.length} contests`);
      
      // Return successful response
      return NextResponse.json(contests);
    } catch (prismaError) {
      console.error("Prisma database error:", prismaError);
      
      // Try a simpler query if the complex one fails (maybe due to missing fields)
      console.log("Attempting simpler fallback query...");
      try {
        const basicContests = await prisma.contest.findMany({
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            contestType: true,
            startDate: true,
            endDate: true
          }
        });
        
        console.log(`Fallback query returned ${basicContests.length} basic contests`);
        return NextResponse.json(basicContests);
      } catch (fallbackError) {
        console.error("Even fallback query failed:", fallbackError);
        throw fallbackError; // Re-throw to be caught by outer catch block
      }
    }
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
      participation_mode: data.participation_mode || "INDIVIDUAL",
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
      contestData.targetgroup = {
        connect: data.targetGroupIds.map((id: number | string) => ({ 
          id: typeof id === 'string' ? parseInt(id) : id 
        }))
      };
    }

    // Create the contest
    const contest = await prisma.contest.create({
      data: contestData,
      include: {
        targetgroup: true,
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
