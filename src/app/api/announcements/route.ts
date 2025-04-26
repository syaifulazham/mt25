import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Mock data for development
const mockAnnouncements = [
  {
    id: 1,
    title: "Important Registration Deadline",
    description: "All participants must complete their registration by March 31, 2025. Late registrations will not be accepted.",
    date: new Date("2025-03-01").toISOString(),
    icon: "calendar",
    link: "/register",
    linkText: "Register Now",
    isActive: true,
    createdAt: new Date("2025-02-15").toISOString(),
    updatedAt: new Date("2025-02-15").toISOString(),
    userId: 1,
    user: {
      id: 1,
      name: "Admin User",
      username: "admin"
    }
  },
  {
    id: 2,
    title: "New Contest Added",
    description: "A new Cybersecurity Challenge has been added to the competition lineup. Check the contests page for details.",
    date: new Date("2025-03-05").toISOString(),
    icon: "shield",
    link: "/contests",
    linkText: "View Contests",
    isActive: true,
    createdAt: new Date("2025-03-05").toISOString(),
    updatedAt: new Date("2025-03-05").toISOString(),
    userId: 1,
    user: {
      id: 1,
      name: "Admin User",
      username: "admin"
    }
  },
  {
    id: 3,
    title: "System Maintenance",
    description: "The platform will be undergoing maintenance on March 15, 2025 from 2:00 AM to 5:00 AM UTC. Some features may be unavailable during this time.",
    date: new Date("2025-03-10").toISOString(),
    icon: "tool",
    link: null,
    linkText: null,
    isActive: true,
    createdAt: new Date("2025-03-10").toISOString(),
    updatedAt: new Date("2025-03-10").toISOString(),
    userId: 1,
    user: {
      id: 1,
      name: "Admin User",
      username: "admin"
    }
  },
  {
    id: 4,
    title: "Participant Orientation",
    description: "All registered participants are invited to attend the virtual orientation session on April 1, 2025 at 10:00 AM UTC.",
    date: new Date("2025-03-15").toISOString(),
    icon: "users",
    link: "/orientation",
    linkText: "Join Session",
    isActive: true,
    createdAt: new Date("2025-03-15").toISOString(),
    updatedAt: new Date("2025-03-15").toISOString(),
    userId: 1,
    user: {
      id: 1,
      name: "Admin User",
      username: "admin"
    }
  }
];

// GET /api/announcements - Get all announcements with optional pagination and search
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;
    const activeOnly = url.searchParams.get("activeOnly") === "true";

    // For development, use mock data if database is empty
    let announcements: any[] = [];
    let totalCount = 0;

    try {
      // Build filter conditions
      const where = {
        ...(search ? {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
          ],
        } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      };

      // Get total count for pagination
      totalCount = await prisma.announcement.count({ where });

      // Get announcements with pagination
      announcements = await prisma.announcement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { date: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      // If database error or no results, use mock data
      if (announcements.length === 0) {
        // Filter mock data based on query parameters
        let filteredMockAnnouncements = [...mockAnnouncements];
        
        if (search) {
          const searchLower = search.toLowerCase();
          filteredMockAnnouncements = filteredMockAnnouncements.filter(item => 
            item.title.toLowerCase().includes(searchLower) || 
            item.description.toLowerCase().includes(searchLower)
          );
        }
        
        if (activeOnly) {
          filteredMockAnnouncements = filteredMockAnnouncements.filter(item => item.isActive);
        }
        
        // Sort by date (newest first)
        filteredMockAnnouncements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        totalCount = filteredMockAnnouncements.length;
        announcements = filteredMockAnnouncements.slice(skip, skip + pageSize);
      }
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return paginated results
    if (url.searchParams.has("page")) {
      return NextResponse.json({
        data: announcements,
        meta: {
          total: totalCount,
          page,
          pageSize,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    }

    // Return all results without pagination
    return NextResponse.json(announcements);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

// POST /api/announcements - Create a new announcement
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Check if user is authenticated and has required role
    if (!user || !hasRequiredRole(user, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create new announcement
    const announcement = await prisma.announcement.create({
      data: {
        title: body.title,
        description: body.description,
        date: body.date ? new Date(body.date) : new Date(),
        icon: body.icon || null,
        link: body.link || null,
        linkText: body.linkText || null,
        isActive: body.isActive || true,
        userId: Number(user.id), // Ensure userId is correctly typed as a number
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      { error: "Failed to create announcement" },
      { status: 500 }
    );
  }
}
